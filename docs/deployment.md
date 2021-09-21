# Deployment Guide

This guide describes how to set up a Carbyne Stack Virtual Cloud (VC) consisting
of two Virtual Cloud Providers (VCP).

## Prerequisites

> :warning: **WARNING**: Carbyne Stack has been tested using the exact versions
> of the tools specified below. Deviating from this _battle tested_
> configuration may create all kinds of issues.

- [Helmfile](https://github.com/roboll/helmfile) v0.140.0
- [Helm](https://helm.sh/) v3.4.1
- [Helm Diff Plugin](https://github.com/databus23/helm-diff) v3.1.3

In addition, this guide assumes you have access to two properly configured K8s
clusters (herein referred to as `apollo` and `starbuck`) with the following
components:

- Kubernetes v1.18.19
- Istio v1.7.3
- MetalLB v0.9.3
- Knative v0.19.0
- Zalando Postgres Operator v1.5.0

Throughout the remainder of this guide, we assume that you have set up local
clusters using the kind tool as described in the
[Platform Setup](platform-setup.md) guide.

## Helm Registry Credentials

The Helm charts for deploying the Carbyne Stack services are hosted on the
GitHub package registry that currently requires authentication. Make the
required credentials available to `helmfile` using:

> :bulb: **NOTE**: Replace `<username>` and `<password>` with your actual
> credentials.

```shell
export GITHUB_USERNAME=<username>
export GITHUB_TOKEN=<password>
```

## Virtual Cloud Deployment

> :bulb: **NOTE**: In case you are on a slow internet connection, you can use
> `kind load docker-image <image> --name <cluster-name>` to load images from
> your local docker registry into the kind clusters. This way you have to
> download the images only once and then reuse them across VCP deployments.

1. Before deploying the virtual cloud providers make some common configuration
   available using:

   > **NOTE**: Replace `172.18.1.128` and `172.18.2.128` with the load balancer
   > IPs assigned to the Istio Ingress Gateway by MetalLB (see the
   > [Platform Setup](platform-setup.md) guide).

   ```shell
   export APOLLO_FQDN="172.18.1.128.sslip.io"
   export STARBUCK_FQDN="172.18.2.128.sslip.io"
   export RELEASE_NAME=cs
   export DISCOVERY_MASTER_HOST=$APOLLO_FQDN
   export NO_SSL_VALIDATION=true
   ```

1. Launch the `starbuck` VCP using:

   ```shell
   export FRONTEND_URL=$STARBUCK_FQDN
   export IS_MASTER=false
   export AMPHORA_VC_PARTNER_URI=http://$APOLLO_FQDN/amphora
   kubectl config use-context kind-starbuck
   helmfile apply
   ```

1. Lauch the `apollo` VCP using:

   ```shell
   export FRONTEND_URL=$APOLLO_FQDN
   export IS_MASTER=true
   export AMPHORA_VC_PARTNER_URI=http://$STARBUCK_FQDN/amphora
   export CASTOR_SLAVE_URI=http://$STARBUCK_FQDN/castor
   kubectl config use-context kind-apollo
   helmfile apply
   ```

1. Wait until all pods in both clusters are in the `ready` state.

## Preparing the Virtual Cloud

1. Carbyne Stack comes with a CLI that can be used to interact with a virtual
   cloud from the command line. Install the CLI using:

   ```shell
   export CLI_VERSION=0.1-SNAPSHOT-1257781266-1-33a14c8
   curl -o cs.jar \
    -L https://maven.pkg.github.com/carbynestack/cli/io.carbynestack.cli/$CLI_VERSION/cli-$CLI_VERSION-jar-with-dependencies.jar
   ```

1. Next configure the CLI to talk to the just deployed virtual cloud by creating
   a matching CLI configuration file in `~/.cs` using:

   ```shell
   mkdir -p ~/.cs
   cat <<EOF | envsubst > ~/.cs/config
   {
     "prime" : 198766463529478683931867765928436695041,
     "r" : 141515903391459779531506841503331516415,
     "noSslValidation" : true,
     "trustedCertificates" : [ ],
     "providers" : [ {
       "amphoraServiceUrl" : "http://$APOLLO_FQDN/amphora",
       "castorServiceUrl" : "http://$APOLLO_FQDN/castor",
       "ephemeralServiceUrl" : "http://$APOLLO_FQDN/",
       "id" : 1,
       "baseUrl" : "http://$APOLLO_FQDN/"
     }, {
       "amphoraServiceUrl" : "http://$STARBUCK_FQDN/amphora",
       "castorServiceUrl" : "http://$STARBUCK_FQDN/castor",
       "ephemeralServiceUrl" : "http://$STARBUCK_FQDN/",
       "id" : 2,
       "baseUrl" : "http://$STARBUCK_FQDN/"
     } ],
     "rinv" : 133854242216446749056083838363708373830
   }
   EOF
   ```

   Alternatively, you can use the CLI tool itself to do the configuration by
   providing the respective values (as seen above in the HEREDOC) when asked
   using:

   ```shell
   java -jar cs.jar configure
   ```

   You can verify that the configuration by fetching telemetry data from castor
   using:

   > :bulb: **NOTE**: Replace `<#>` with either `1` for the `apollo` cluster or
   > `2` for the `starbuck` cluster.

   ```shell
   java -jar cs.jar castor get-telemetry <#>
   ```

1. Before you can actually use the services provided by the VC, you have to
   upload cryptographic material. As generating offline material is a very
   time-consuming process, we provide pre-generated material.

   > :warning: **WARNING**: Using pre-generated offline material is not secure
   > at all. ***DO NOT DO THIS IN A PRODUCTION SETTING***.

   1. Download and decompress the archive containing the material using:

      ```shell
      curl -O \
        -L https://raw.githubusercontent.com/carbynestack/base-images/master/fake-crypto-material.zip
      unzip -d crypto-material fake-crypto-material.zip
      rm fake-crypto-material.zip
      ```

1. Upload and activate tuples using:

   > :bulb: **Note**: Adapt the `NUMBER_OF_CHUNKS` variable in the following
   > snippet to tune the number of uploaded tuples. In case
   > `NUMBER_OF_CHUNKS > 1` the *same* tuples are uploaded repeatedly.

   ```shell
   cat << 'EOF' > upload-tuples.sh
   #!/bin/bash
   SCRIPT_PATH="$( cd "$(dirname "$0")" ; pwd -P )"
   TUPLE_FOLDER=${SCRIPT_PATH}/crypto-material/2-128-40
   CLI_PATH=${SCRIPT_PATH}
   NUMBER_OF_CHUNKS=1

   function uploadTuples {
      echo ${NUMBER_OF_CHUNKS}
      for type in INPUT_MASK_GFP MULTIPLICATION_TRIPLE_GFP; do
         for (( i=0; i<${NUMBER_OF_CHUNKS}; i++ )); do
            local chunkId=$(uuidgen)
            echo "Uploading ${type} to http://${APOLLO_FQDN}/castor (Apollo)"
            java -jar ${CLI_PATH}/cs.jar castor upload-tuple -f ${TUPLE_FOLDER}/Triples-p-P0 -t ${type} -i ${chunkId} 1
            local statusMaster=$?
            echo "Uploading ${type} to http://${STARBUCK_FQDN}/castor (Starbuck)"
            java -jar ${CLI_PATH}/cs.jar castor upload-tuple -f ${TUPLE_FOLDER}/Triples-p-P1 -t ${type} -i ${chunkId} 2
            local statusSlave=$?
            if [[ "${statusMaster}" -eq 0 && "${statusSlave}" -eq 0 ]]; then
               java -jar ${CLI_PATH}/cs.jar castor activate-chunk -i ${chunkId} 1
               java -jar ${CLI_PATH}/cs.jar castor activate-chunk -i ${chunkId} 2
            else
               echo "ERROR: Failed to upload one tuple chunk - not activated"
            fi
         done
      done
   }

   uploadTuples
   EOF
   chmod 755 upload-tuples.sh
   ./upload-tuples.sh
   ```

   1. You can verify that the uploaded tuples are now available for use by the
      Carbyne Stack services using:

      > :bulb: **NOTE**: Replace `<#>` with either `1` for the `apollo` cluster
      > or `2` for the `starbuck` cluster.

      ```shell
      java -jar cs.jar castor get-telemetry <#>
      ```

You now have a fully functional Carbyne Stack Virtual Cloud at your hands.

## Teardown the Virtual Cloud

You can tear down the Virtual Cloud by tearing down the Virtual Cloud Providers
using:

```shell
for var in apollo starbuck
do
  kubectl config use-context kind-$var
  helmfile destroy
done
```
