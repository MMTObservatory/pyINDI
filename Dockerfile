FROM python:3.8.2-buster

MAINTAINER Scott Swindell "sswindell@mmto.org"
COPY . .  
RUN apt-get update
RUN apt-get -y install \
	cmake g++ libindi-dev indi-bin libnova-dev zlib1g-dev
RUN pip install 'scipy<1.4.0' 
RUN pip install -e .[all]
