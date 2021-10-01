# Carbyne Stack

[![Codacy Badge](https://app.codacy.com/project/badge/Grade/197a4f29b04a417c950285a38f787e6f)](https://www.codacy.com?utm_source=github.com&utm_medium=referral&utm_content=carbynestack/carbynestack&utm_campaign=Badge_Grade)
[![Known Vulnerabilities](https://snyk.io/test/github/carbynestack/carbynestack/badge.svg)](https://snyk.io/test/github/carbynestack/carbynestack)
[![pre-commit](https://img.shields.io/badge/pre--commit-enabled-brightgreen?logo=pre-commit&logoColor=white)](https://github.com/pre-commit/pre-commit)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg)](CODE_OF_CONDUCT.md)

Carbyne Stack is a Cloud Native Secure Multiparty Computation (MPC) platform
released under Apache License 2.0. Use Carbyne Stack to build resilient scalable
infrastructure for sensitive data workloads. More information can be found on
the [Carbyne Stack website](https://carbynestack.io).

> **DISCLAIMER**: Carbyne Stack is *alpha* software. The software is not ready
> for production use. It has neither been developed nor tested for a specific
> use case. The underlying Secure Multiparty Computation protocols are
> *currently* used in a way that is not secure.

## Getting Started

Carbyne Stack can be deployed and experimented with locally. See the
[Getting Started](https://carbynestack.io/getting-started/) section on the
[Carybne Stack website](https://carbynestack.io) for instructions.

## Contributing

Please see the Carbyne Stack [Contributor's Guide](CONTRIBUTING.md).

## License

Carbyne Stack is open-sourced under the Apache License 2.0. See the
[LICENSE](LICENSE) file for details.

### 3rd Party Licenses

Carbyne Stack relies heavily on 3rd party Open Source Software. Artifacts that
comprise 3rd party OSS and that are distributed by us, e.g., Java archives and
Docker Images, are built to satisfy the license obligations of the 3rd party OSS
components. A _Software Bill of Materials_ (SBOM), copyright notices, license
texts and links to the source codes for the 3rd party OSS components are made
available at the root of the module source tree in a folder called
`3RD-PARTY-LICENSES`. The following sections describe how this information is
distributed with or alongside the generated Carbyne Stack artifacts.

#### GitHub Releases

When Carbyne Stack software artifacts are built and published, all information
about linked and redistributed 3rd-party OSS components is collected from the
`3RD-PARTY-LICENSES` folder of the respective artifact and attached to the
GitHub release page. Where applicable, license texts and notice files are packed
into a file for each component following the naming scheme
`<artifact-name>-3rd-party-copyrights.zip`. Sources files are downloaded and
bundled into a single archive called `<artifact-name>-3rd-party-sources.zip`.

#### Docker Images

All _Carbyne Stack_ Docker images are based on one of the
[Carbyne Stack Docker Base Images](https://github.com/carbynestack/base-images).
With each [release](https://github.com/carbynestack/base-images/releases) of one
of these base images, a _Disclosure Documentation_ is published, which contains
a list of all included software packages, their licenses and sources that are
distributed with the corresponding image. The download link to the _Disclosure
Documentation_ can also be obtained from the image using:

```shell
docker inspect --format '{{index .Config.Labels "3rd-party-disclosure"}}' ${IMAGE_REPOSITORY}:${IMAGE_TAG}
```

More information about additional software components distributed with an image
is also provided inside the Docker Image in the folder `/3RD-PARTY-LICENSES` or
as follows:

- Docker images built using [ko](https://github.com/google/ko) include the SBOM
  and associated files in the folder `/var/run/ko`.
- For images created using [Maven](https://maven.apache.org/) by means of the
  [Dockerfile Maven Plugin](https://github.com/spotify/dockerfile-maven) the
  artifacts are made available in the root folder of the image.

#### Java Archives

Java Archives (JARs) are built using [Maven](https://maven.apache.org/). The
SBOM is created as part of the regular build process and made available together
with the associated files at a location that depends on the type of the JAR that
is built:

- For plain JARs that just contain the component itself and for fat JARs built
  using the
  [Maven Assembly Plugin](https://maven.apache.org/plugins/maven-assembly-plugin/)
  , the artifacts are made available in the root folder of the JAR.

- For runnable fat JARs built by the
  [Spring Boot Maven Plugin](https://docs.spring.io/spring-boot/docs/current/maven-plugin/reference/htmlsingle/)
  the artifacts are made available in the folder `/BOOT-INF/classes/` of the
  JAR.

> **NOTE**: While the SBOM is derived automatically from the dependencies
> specified in the project object model (`pom.xml`), the files required to
> fulfill license obligations (e.g. license and notice files) have to be
> provided manually.

## Export Control

Carbyne Stack includes cryptographic software. The country in which you
currently reside may have restrictions on the import, possession, use, and/or
re-export to another country, of encryption software. **Before** using any
encryption software, please check your country's laws, regulations and policies
concerning the import, possession, or use, and re-export of encryption software,
to see if this is permitted. See the
[Wassenaar Arrangement](http://www.wassenaar.org) website for more information.

Robert Bosch GmbH has classified this software as Export Commodity Control
Number (ECCN) 5D002, which includes information security software using or
performing cryptographic functions with asymmetric algorithms. The form and
manner of this distribution makes it eligible for export under the "publicly
available" Section 742.15(b) and 734.3(b)(3) exemptions (see the BIS Export
Administration Regulations, Section 742.15(b) and Section 734.3(b)(3)) for both
object code and source code.

For additional information see the Carbyne Stack
[website](https://www.carbynestack.io/legal/export-control/).
