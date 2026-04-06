#!/bin/bash
# Deploy with buildpack sunset bypass
export ALLOW_EOL_SHIMMED_BUILDER=1
flyctl deploy --app resgrid2eso