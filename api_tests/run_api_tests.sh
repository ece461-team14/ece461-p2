#!/bin/bash

# Check if the first argument is provided
if [[ -n "$1" && "$1" == *.postman_test.json ]]; then
    echo "Running Newman tests on $1..."
    newman run "$1" --reporters cli -e dev-bucket.postman_environment.json --export-environment dev-bucket.postman-environment.json

elif [[ -z "$1" ]]; then
    echo "No *.postman_test.json argument provided. Running all tests..."
    for collection in *.postman_collection.json; do
        echo "Running Newman tests for $collection";
        newman run "$collection" --reporters cli -e dev-bucket.postman_environment.json --export-environment dev-bucket.postman_environment.json;
    done

else
    echo "Invalid argument. Please provide a valid *.postman_test.json file or no argument to run all tests."
    echo "Usage: ./run_api_tests.sh <path-to-postman-test.json>"
fi
