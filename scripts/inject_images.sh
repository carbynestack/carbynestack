#!/bin/bash

IMAGES=(
"ghcr.io/carbynestack/amphora-service:0.1-SNAPSHOT-1257676920-1-1db68bb"
"ghcr.io/carbynestack/castor-service:0.1-SNAPSHOT-1257597392-1-6853da7"
"ghcr.io/carbynestack/ephemeral/discovery:0.1-SNAPSHOT-1257716526-1-5deb524"
"ghcr.io/carbynestack/ephemeral/network-controller:0.1-SNAPSHOT-1257716526-1-5deb524"
"ghcr.io/carbynestack/ephemeral/ephemeral:0.1-SNAPSHOT-1257716526-1-5deb524"
"redis:6.2.5"
"minio/minio:latest"
"registry.opensource.zalan.do/acid/spilo-12:1.6-p3"
"ghcr.io/carbynestack/serving/activator-ecd51ca5034883acbe737fde417a3d86@sha256:a616000fe38bc5888cb1c32427cce16aa870112ef698affaaa066fb10d4c98e4"
"ghcr.io/carbynestack/serving/autoscaler-12c0fa24db31956a7cfa673210e4fa13@sha256:0210ad68c9a3e2ff4d7e9f2e5008bf2c9b48a8a11f2602d9d742b5ada3f4634c"
"ghcr.io/carbynestack/serving/controller-f6fdb41c6acbc726e29a3104ff2ef720@sha256:c30b0f681f2ed97dd7154dfd0d6e0b8f97c7d4572ad006137f482ce0f767c0f6"
"gcr.io/knative-releases/knative.dev/net-istio/cmd/webhook@sha256:c8bf9cf76139083d6623c40215426c8998acd46eb156cc7ff998c8c2b9e4051c"
"gcr.io/knative-releases/knative.dev/net-certmanager/cmd/webhook@sha256:a4a04ad82be96af9f318a17013d1c543c153f53a2950522bd9c014f42dc347dc"
"gcr.io/knative-releases/knative.dev/net-certmanager/cmd/controller@sha256:0336e24c5a2896685b21c22a07c07d29f564d599b8398c3792ab50e951510c99"
"gcr.io/knative-releases/knative.dev/net-istio/cmd/controller@sha256:824a65ea309850962629c778aafa4dc2f9c8a807c817089236d468a773153d73"
"ghcr.io/carbynestack/serving/webhook-261c6506fca17bc41be50b3461f98f1c@sha256:8cb4b07571fefd5026740317a1f382952c61c2d4fa50038f804191b2bb67a604"
)

DEV_IMAGES=(
)

CLUSTER_NAMES=("apollo" "starbuck")

if [[ -n "${@}" ]]; then
  if [ ! $# -eq 2 ]; then
    echo -e "WARNING: Invalid number of cluster names defined ($# - [$@])"
    echo -e "         Using default cluster names [${CLUSTER_NAMES[@]}]"
  else
    CLUSTER_NAMES=(${@})
  fi
fi

for image in ${IMAGES[*]}; do
  docker pull "${image}"
done

for cluster in ${CLUSTER_NAMES[@]}; do
  for image in ${IMAGES[@]} ${DEV_IMAGES[@]}; do
    kind load docker-image "$image" --name "$cluster"
  done
done

exit 0
