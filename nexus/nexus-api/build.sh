#! /usr/bin/env bash

if [ "$1" != "dev" ] && [ "$1" != "prod" ]; then
    echo "Unknown target:" $1;
    exit 1;
fi

DEV=kscw-nexus-a7tp-stg
PROD=kscw-nexus-5z8v-prd

# Start build
target=$1;
error=0
if [ "$1" == "dev" ]; then
    echo "Building dev...";
    gcloud builds submit --project $DEV --tag gcr.io/$DEV/nexus-api;
    error=$?;
elif [ "$1" == "prod" ]; then
    echo "Building production...";
    gcloud builds submit --project $PROD --tag gcr.io/$PROD/nexus-api;
    error=$?;
else
    echo "Unknown target " $1;
    error=1;
fi;


if [ "$error" != 0 ]; then
    exit 1;
fi
