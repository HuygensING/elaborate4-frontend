FROM gijsjan/webdev:1.0
MAINTAINER Gijsjan Brouwer

USER root
RUN apt-get update
RUN apt-get -y install sudo

RUN echo "developer:developer" | chpasswd && adduser developer sudo

USER developer
WORKDIR /home/developer

ENTRYPOINT ["./project/docker/entrypoint.sh"]