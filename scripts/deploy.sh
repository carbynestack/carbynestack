#!/bin/bash

DIRECTORY="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

RELEASE_NAME=cs
NO_SSL_VALIDATION=true
CLUSTER_A_NAME=apollo
CLUSTER_A_FQDN=172.18.1.128.sslip.io
CLUSTER_B_NAME=starbuck
CLUSTER_B_FQDN=172.18.2.128.sslip.io

while [ $# -gt 0 -a "$1" != "" ]; do
  case $1 in
  -r | --release-name)
    RELEASE_NAME="$2"
    shift
    ;;
  -s | --no-ssl-validation)
    NO_SSL_VALIDATION="$2"
    shift
    ;;
  --cluster-a-name)
    CLUSTER_A_NAME=("$2")
    shift
    ;;
  --cluster-a-fqdn)
    CLUSTER_A_FQDN=("$2")
    shift
    ;;
  --cluster-b-name)
    CLUSTER_B_NAME=("$2")
    shift
    ;;
  --cluster-b-fqdn)
    CLUSTER_B_FQDN=("$2")
    shift
    ;;
  *)
    echo Invalid option \"$1\"
    exit 1
    ;;
  esac
  shift
done

cd $DIRECTORY/..

export RELEASE_NAME=$RELEASE_NAME
export DISCOVERY_MASTER_HOST=$CLUSTER_A_FQDN
export NO_SSL_VALIDATION=$NO_SSL_VALIDATION

export FRONTEND_URL=$CLUSTER_B_FQDN
export IS_MASTER=false
export AMPHORA_VC_PARTNER_URI=http://$CLUSTER_A_FQDN/amphora
kubectl config use-context kind-$CLUSTER_B_NAME
helmfile apply

export FRONTEND_URL=$APOLLO_FQDN
export IS_MASTER=true
export AMPHORA_VC_PARTNER_URI=http://$CLUSTER_B_FQDN/amphora
export CASTOR_SLAVE_URI=http://$CLUSTER_B_FQDN/castor
kubectl config use-context kind-$CLUSTER_A_NAME
helmfile apply

cd -

echo
echo Inspect VCPs using the following commands:
echo
echo $CLUSTER_A_NAME
echo kubectl config use-context kind-$CLUSTER_A_NAME
echo kubectl get pods
echo
echo $CLUSTER_B_NAME
echo kubectl config use-context kind-$CLUSTER_B_NAME
echo kubectl get pods

exit 0
