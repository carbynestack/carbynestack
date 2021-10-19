#!/bin/bash

DIRECTORY="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

CLUSTER_NAMES=("apollo" "starbuck")
SPINNER=(
"\u2800"
"\u2801"
"\u2809"
"\u2819"
"\u2839"
"\u28B9"
"\u28F9"
"\u28FD"
"\u28FF"
"\u28FE"
"\u28F6"
"\u28E6"
"\u28C6"
"\u2846"
"\u2806"
"\u2802"
)

createClusters() {
  for cluster in ${CLUSTER_NAMES[@]}; do
    kind create cluster --name $cluster --image kindest/node:v1.18.19
  done;
}

phase1() {
  for i in ${!CLUSTER_NAMES[@]}; do
    kubectl config use-context kind-${CLUSTER_NAMES[$i]}
    curl -L https://istio.io/downloadIstio | ISTIO_VERSION=1.7.3 TARGET_ARCH=x86_64 sh -
    helm install istio-operator istio-1.7.3/manifests/charts/istio-operator \
      --set operatorNamespace=istio-operator \
      --set watchedNamespaces="istio-system" \
      --set hub="docker.io/istio" \
      --set tag="1.7.3"
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
    kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.9.3/manifests/namespace.yaml
    kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.9.3/manifests/metallb.yaml
    kubectl create secret generic -n metallb-system memberlist --from-literal=secretkey="$(openssl rand -base64 128)"
    export SUBNET=172.18.$((i+1)).255/25
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
  done
}

phase2() {
  for i in ${!CLUSTER_NAMES[@]}; do
    kubectl config use-context kind-${CLUSTER_NAMES[$i]}
    ip_var=${CLUSTER_NAMES[$i]^^}_EXTERNAL_IP
    echo -ne "obtaining IP  "
    tput civis
    k=0
    while [[ -z "${!ip_var}" ]]; do
      echo -ne "\b${SPINNER[$k]}"
      export ${ip_var}=$(kubectl get services \
        --namespace istio-system istio-ingressgateway \
        --output jsonpath='{.status.loadBalancer.ingress[0].ip}' 2> /dev/null)
      sleep .2
      k=$(( (k+1) % ${#SPINNER[@]} ))
    done
    echo -e "\b - ${!ip_var}"
    tput cnorm
    kubectl apply -f https://github.com/knative/operator/releases/download/v0.19.0/operator.yaml
    kubectl create namespace knative-serving
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
        ${!ip_var}.sslip.io: ""
EOF
    kubectl apply -f knative-serving.yaml
    curl -sL https://github.com/zalando/postgres-operator/archive/refs/tags/v1.5.0.tar.gz | tar -xz
    helm install postgres-operator postgres-operator-1.5.0/charts/postgres-operator
  done
}

if [[ -n "${@}" ]]; then
  if [ ! $# -eq 2 ]; then
    >&2 echo -e "WARNING: Invalid number of cluster names defined ($# - [$@])"
    >&2 echo -e "         Using default cluster names [${CLUSTER_NAMES[@]}]"
  else
    CLUSTER_NAMES=(${@})
  fi
fi

createClusters
phase1
$DIRECTORY/inject_images.sh ${CLUSTER_NAMES[@]}
phase2


echo
echo Clusters deployed at:
for i in ${!CLUSTER_NAMES[@]}; do
  ip_var=${CLUSTER_NAMES[$i]^^}_EXTERNAL_IP
  echo "   ${CLUSTER_NAMES[$i]}: ${!ip_var}"
done

cluster_a_ip_var=${CLUSTER_NAMES[0]^^}_EXTERNAL_IP
cluster_b_ip_var=${CLUSTER_NAMES[1]^^}_EXTERNAL_IP
echo Deploy VC as follows:
echo ./$(realpath --relative-to="$(pwd)" "$DIRECTORY/deploy.sh") --cluster-a-name ${CLUSTER_NAMES[0]} --cluster-a-fqdn "${!cluster_a_ip_var}.sslip.io" --cluster-b-name ${CLUSTER_NAMES[1]} --cluster-b-fqdn "${!cluster_b_ip_var}.sslip.io"

exit 0
