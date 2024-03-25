#!/bin/bash

# Stop the controllabio-remote service
sudo systemctl stop controllabio-remote.service

# Start coloring and print the message
printf "\033[1;32m" # Start coloring
echo
echo "********************************************************************************"
echo "Control Lab IO Remote has been stopped."
echo "********************************************************************************"
echo
printf "\033[0m" # Reset text color back to default
