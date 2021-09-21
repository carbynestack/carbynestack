# Platform Setup Guide

This guide describes how to prepare various Kubernetes platforms (`kind` for now
only, but others will be added later) for deploying a Carbyne Stack Virtual
Cloud Provider (see the [Deployment Guide](deployment.md) for installation
instructions)

## Kind

Follow these instructions to prepare a kind cluster for Carbyne Stack
installation. After completing the steps described below, you should have the
following pods deployed in your kind K8s cluster:

```shell
kubectl get pods -A
NAMESPACE            NAME                                           READY   STATUS    RESTARTS   AGE
default              knative-operator-7fc877bffd-f9qdh              1/1     Running   0          115s
default              postgres-operator-74f9948c5f-l8mpd             1/1     Running   0          24s
istio-operator       istio-operator-6d7958b7bf-j5f78                1/1     Running   0          4m10s
istio-system         istio-ingressgateway-7b757f7699-4sjk9          1/1     Running   0          3m10s
istio-system         istiod-7556f7fddf-4gg6t                        1/1     Running   0          3m26s
knative-serving      activator-749f4f58bd-bvgvk                     1/1     Running   0          66s
knative-serving      autoscaler-848955c655-7ndxc                    1/1     Running   0          65s
knative-serving      controller-8c7b5f59c-d7brb                     1/1     Running   0          65s
knative-serving      istio-webhook-566b5df9f-6fhvt                  1/1     Running   0          61s
knative-serving      net-certmanager-webhook-5886f5f5cb-26sbr       1/1     Running   0          59s
knative-serving      networking-certmanager-6b5cb4b9d6-c4gl2        1/1     Running   0          60s
knative-serving      networking-istio-795f8cd665-27vcs              1/1     Running   0          61s
knative-serving      webhook-5fd89bbf5-gghtq                        1/1     Running   0          64s
kube-system          coredns-66bff467f8-ht8hb                       1/1     Running   0          4m20s
kube-system          coredns-66bff467f8-vsndf                       1/1     Running   0          4m20s
kube-system          etcd-apollo-control-plane                      1/1     Running   0          4m30s
kube-system          kindnet-jht6w                                  1/1     Running   0          4m20s
kube-system          kube-apiserver-apollo-control-plane            1/1     Running   0          4m30s
kube-system          kube-controller-manager-apollo-control-plane   1/1     Running   0          4m30s
kube-system          kube-proxy-w5dfw                               1/1     Running   0          4m20s
kube-system          kube-scheduler-apollo-control-plane            1/1     Running   0          4m30s
local-path-storage   local-path-provisioner-59c6df4d-962pq          1/1     Running   0          4m20s
metallb-system       controller-57f648cb96-vgtsp                    1/1     Running   0          3m15s
metallb-system       speaker-c8lq5                                  1/1     Running   0          3m15s
```

### Prerequisites

- [Docker Engine](https://docs.docker.com/engine/) v20.10.6
- [Kind](https://kind.sigs.k8s.io/) v0.11.0
- [kubectl](https://kubernetes.io/docs/tasks/tools/) v1.21.1
- [Helm](https://helm.sh/) v3.4.1

> :warning: **WARNING**: Carbyne Stack has been tested using the exact versions
> of the tools specified above. Deviating from this _battle tested_
> configuration may create all kinds of issues.

### Setup

#### Kind Cluster

Start a kind cluster using:

```shell
kind create cluster --image kindest/node:v1.18.19
```

For local testing you will typically need two Carbyne Stack Virtual Cloud
Providers deployed to separate K8s clusters. Assuming your clusters are called
`apollo` and `starbuck`, you can use the `--name <name>` option to launch a kind
cluster with K8s context name `kind-<name>`, e.g.:

```shell
kind create cluster --name apollo --image kindest/node:v1.18.19
```

You can switch between clusters easily using:

> :bulb: **NOTE**: Replace `<name>` with the name you have chosen above for your
> cluster (e.g., `apollo`).

```shell
kubectl config use-context kind-<name>
```

#### Istio

1. Install the
   [Istio Operator](https://istio.io/latest/docs/setup/install/operator/) v1.7.3
   using:

   ```shell
   curl -L https://istio.io/downloadIstio | ISTIO_VERSION=1.7.3 TARGET_ARCH=x86_64 sh -
   helm install istio-operator istio-1.7.3/manifests/charts/istio-operator \
     --set operatorNamespace=istio-operator \
     --set watchedNamespaces="istio-system" \
     --set hub="docker.io/istio" \
     --set tag="1.7.3"
   ```

1. Create an Istio Control Plane in a dedicated namespace using:

   ```shell
   cat <<EOF > istio-control-plane.yaml
   apiVersion: v1
   kind: Namespace
   metadata:
     name: istio-system
   ---
   apiVersion: install.istio.io/v1alpha1
   kind: IstioOperator
   metadata:
     namespace: istio-system
     name: cs-istiocontrolplane
   spec:
     meshConfig:
       accessLogFile: /dev/stdout
     components:
       ingressGateways:
         - name: istio-ingressgateway
           enabled: true
           k8s:
             resources:
               requests:
                 cpu: 10m
                 memory: 40Mi
             service:
               ports:
                 ## You can add custom gateway ports in user values overrides, but it must include those ports since helm replaces.
                 # Note that AWS ELB will by default perform health checks on the first port
                 # on this list. Setting this to the health check port will ensure that health
                 # checks always work. https://github.com/istio/istio/issues/12503
                 - port: 15021
                   targetPort: 15021
                   name: status-port
                 - port: 80
                   targetPort: 8080
                   name: http2
                 - port: 443
                   targetPort: 8443
                   name: https
                 - port: 31400
                   targetPort: 31400
                   name: tcp
                   # This is the port where sni routing happens
                 - port: 15443
                   targetPort: 15443
                   name: tls
                 - port: 30000
                   name: ephemeral-mpc-engine-port-0
                 - port: 30001
                   name: ephemeral-mpc-engine-port-1
                 - port: 30002
                   name: ephemeral-mpc-engine-port-2
                 - port: 30003
                   name: ephemeral-mpc-engine-port-3
                 - port: 30004
                   name: ephemeral-mpc-engine-port-4
       pilot:
         k8s:
           env:
             - name: PILOT_TRACE_SAMPLING
               value: "100"
           resources:
             requests:
               cpu: 10m
               memory: 100Mi
     values:
       global:
         proxy:
           resources:
             requests:
               cpu: 10m
               memory: 40Mi
       pilot:
         autoscaleEnabled: false
       gateways:
         istio-egressgateway:
           autoscaleEnabled: false
         istio-ingressgateway:
           autoscaleEnabled: false
   EOF
   kubectl apply -f istio-control-plane.yaml
   ```

#### MetalLB

1. Install [MetalLB](https://metallb.universe.tf/) v0.9.3 using:

   ```shell
   kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.9.3/manifests/namespace.yaml
   kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.9.3/manifests/metallb.yaml
   kubectl create secret generic -n metallb-system memberlist --from-literal=secretkey="$(openssl rand -base64 128)"
   ```

1. Configure MetalLB using:

   > :bulb: **NOTE**: Choose a different value between 1 and 254 for each of
   > your clusters. For conveniently deploying Carbyne Stack as described in the
   > [Deployment Guide](deployment.md), consider using 1 and 2, respectively.

   ```shell
   export SUBNET=172.18.<i>.255/25
   cat <<EOF | envsubst > metallb.yaml
   apiVersion: v1
   kind: ConfigMap
   metadata:
     namespace: metallb-system
     name: config
   data:
     config: |
       address-pools:
       - name: default
         protocol: layer2
         addresses:
         - ${SUBNET}
         avoid-buggy-ips: true
   EOF
   kubectl apply -f metallb.yaml
   ```

1. Export the external IP assigned to the Istio Ingress Gateway for later use:

   ```shell
   export EXTERNAL_IP=$(kubectl get services \
      --namespace istio-system istio-ingressgateway \
      --output jsonpath='{.status.loadBalancer.ingress[0].ip}')
   ```

#### Knative

1. Install the
   [Knative Operator](https://knative.dev/docs/install/knative-with-operators/)
   v0.19.0 using:

   ```shell
   kubectl apply -f https://github.com/knative/operator/releases/download/v0.19.0/operator.yaml
   ```

1. Create a namespace for Knative Serving using:

   ```shell
   kubectl create namespace knative-serving
   ```

1. Install the patched Knative Serving component with a
   [sslip.io](https://sslip.io/) custom domain using:

   ```shell
   cat <<EOF | envsubst > knative-serving.yaml
   apiVersion: operator.knative.dev/v1alpha1
   kind: KnativeServing
   metadata:
     name: knative-serving
     namespace: knative-serving
   spec:
     version: 0.19.0
     manifests:
       - URL: https://github.com/carbynestack/serving/releases/download/v0.19.0_multiport-patch/serving-crds.yaml
       - URL: https://github.com/carbynestack/serving/releases/download/v0.19.0_multiport-patch/serving-core.yaml
       - URL: https://github.com/knative/net-istio/releases/download/v0.19.0/release.yaml
       - URL: https://github.com/knative/net-certmanager/releases/download/v0.19.0/release.yaml
     config:
        domain:
           ${EXTERNAL_IP}.sslip.io: ""
   EOF
   kubectl apply -f knative-serving.yaml
   ```

#### Postgres Operator

Deploy the
[Zalando Postgres operator](https://github.com/zalando/postgres-operator) v1.5.0
using:

```shell
curl -sL https://github.com/zalando/postgres-operator/archive/refs/tags/v1.5.0.tar.gz | tar -xz
helm install postgres-operator postgres-operator-1.5.0/charts/postgres-operator
```

### Teardown

If you no longer need the cluster you can tear it down using:

> :bulb: **NOTE**: Replace `<name>` with the name you have chosen when creating
> your cluster (e.g., `apollo`).

```shell
kind delete cluster --name <name>
```

### Troubleshooting

#### OpenVPN

In case you use OpenVPN and encounter an error message when launching a kind
cluster like

```shell
ERROR: failed to create cluster: failed to ensure docker network: command "docker network create -d=bridge -o com.docker.network.bridge.enable_ip_masquerade=true -o com.docker.network.driver.mtu=1500 --ipv6 --subnet fc00:f853:ccd:e793::/64 kind" failed with error: exit status 1
Command Output: Error response from daemon: could not find an available, non-overlapping IPv4 address pool among the default
```

follow the advice given [here](https://stackoverflow.com/a/45694531).
