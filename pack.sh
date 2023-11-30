#!/usr/bin/env bash

version=$(sed 's/[ ",]*//g' manifest.json | sed -n '/^version/p'|awk -F: '{print $2}')

echo Version is: $version

projectDir=$(basename `pwd`)
git tag -a "${version}" -m "version ${version}"
git push --tags
cd ..
zip -x *.sh -x *.MD -r free-auto-refresh-$version.zip ./${projectDir}/*
