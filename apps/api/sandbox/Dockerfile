FROM ubuntu:24.04

RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
       bash coreutils findutils grep sed gawk procps iproute2 psmisc util-linux \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /workspace \
    && chown ubuntu:ubuntu /workspace

USER ubuntu
WORKDIR /workspace
CMD ["/bin/bash"]
