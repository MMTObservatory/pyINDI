FROM python:latest

RUN apt-get update
RUN apt install -y software-properties-common # apt-add-repository
RUN apt-add-repository ppa:mutlaqja && \ 
	apt-get -y install indi-bin

COPY . .  
RUN pip install --update pip && \
	pip install -e .[all]
ENV INDISKELFILE=./example_drivers/skeleton.xml

CMD indiserver ./example_drivers/skeleton.py