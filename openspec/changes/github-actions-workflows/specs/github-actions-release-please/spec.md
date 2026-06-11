# GitHub Actions Release-please

## Purpose
Automated versioning and release PR creation on pushes to main.

## Requirements

### Requirement: Release-please Trigger
The release-please workflow MUST run on every push to main.

#### Scenario: Push to main
- GIVEN a commit is pushed to main
- WHEN the push completes
- THEN the release-please workflow MUST run

### Requirement: Release-please Config
The project MUST contain release-please-config.json and .release-please-manifest.json with release-type: node.

#### Scenario: Config present
- GIVEN the config files exist
- WHEN release-please runs
- THEN it MUST read the configuration correctly

### Requirement: Private Package
Release-please MUST handle the private: true package without attempting npm publish.

#### Scenario: Private release
- GIVEN package.json has private: true
- WHEN release-please creates a release
- THEN it MUST create a GitHub release without publishing to npm
