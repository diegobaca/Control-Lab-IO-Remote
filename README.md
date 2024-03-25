# Control-Lab-IO-Remote
Web-Based Control Interface for Motors on the LEGO Interface B.

## Installation on Raspberry Pi (takes ~15 min):

1. **Install Raspberry Pi OS Lite** using Raspberry Pi Imager: [Raspberry Pi Software](https://www.raspberrypi.com/software/)
2. **Apply OS customization** when prompted. Edit settings to configure hostname, username, password, wireless network information, and enable SSH (found under services).
3. **SSH into Raspberry Pi**, e.g., use the terminal command `ssh pi@raspberrypi.local`.
   - **NOTE:** `pi` is the username, and `raspberrypi` is the hostname by default.
4. **Install Git** with the command: `sudo apt install git`.
5. **Clone Control Lab IO Remote** repository by running: `git clone https://github.com/diegobaca/Control-Lab-IO-Remote.git`.
6. **Navigate to the Control Lab IO Remote folder** with `cd /home/pi/Control-Lab-IO-Remote`. Replace `pi` with your own username if you changed it during OS customization.
7. **Run the installation script** with `sudo ./install.sh`. This can take a while if you choose 'yes' to the system updates. Look for the message **"Installation of Control Lab IO Remote is complete."** when installation is finished.
8. **Open a web browser** on a device connected to the same network and type the Raspberry Pi's IP address to connect.

## Post-Installation Commands
After installation, you can use the following commands via SSH to manage the Control Lab IO Remote service:
- **Check Service Status**: `statuscontrollab` - Checks the status of the Control Lab IO Remote service.
- **Stop Service**: `stopcontrollab` - Stops the Control Lab IO Remote service.
- **Start Service**: `startcontrollab` - Starts the Control Lab IO Remote service.
