#!/bin/bash

# Check if controllabio-remote service is active
if systemctl is-active --quiet controllabio-remote.service; then
    # Start coloring and print the message
    printf "\033[1;32m" # Start coloring
    echo
    echo "********************************************************************************"
    echo "Control Lab IO Remote is already running."
    echo "********************************************************************************"
    echo
    printf "\033[0m" # Reset text color back to default
else
    # Start the controllabio-remote service
    sudo systemctl start controllabio-remote.service
    
    # Start coloring and print the message
    printf "\033[1;32m" # Start coloring
    echo
    echo "********************************************************************************"
    echo "Control Lab IO Remote has started."
    echo "********************************************************************************"
    echo
    printf "\033[0m" # Reset text color back to default
fi
