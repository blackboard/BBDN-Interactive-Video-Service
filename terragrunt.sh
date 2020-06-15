#!/usr/bin/env bash

set -e

function help {
  echo "Syntax: ./terragrunt.sh --fleet playground-fozzie-us-east-1-cluster01 --service=[service] [action]"
}

EXTRA_ARGS=""

POSITIONAL=()
while [[ $# -gt 0 ]]
do
key="$1"

case $key in
    -f|--fleet)
      FLEET="$2"
    shift
    shift
    ;;
    -s|--service)
    SERVICE="$2"
    shift
    shift
    ;;
    *)
    POSITIONAL+=("$1")
    shift
    ;;
esac
done
set -- "${POSITIONAL[@]}" # restore positional parameters

if [[ ! -n "$SERVICE" ]]
then
  help
  exit 1
fi

if [[ "$1" == "plan" ]]
then
  EXTRA_ARGS="$EXTRA_ARGS -out .terraform.plan"
fi

if [[ -n "$SERVICE" ]] && [[ -n "$FLEET" ]] && [[ -z "$CI" ]]; then
  EXTRA_ARGS="$EXTRA_ARGS --terragrunt-source ../..//services/$SERVICE/"
fi

set -x

cd "terraform/environments/$SERVICE"

if [[ -n "$FLEET" ]]; then
  export TERRAGRUNT_CONFIG=${FLEET}.hcl
  export TERRAGRUNT_DOWNLOAD=.terragrunt-cache/${FLEET}
fi

ENVIRONMENT=$ENVIRONMENT terragrunt ${@} ${EXTRA_ARGS} ${PLAN_DIR}
