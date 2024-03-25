from flask import Flask, render_template, request, jsonify
import threading
import serial.tools.list_ports
import serial
import time

app = Flask(__name__)

# Serial connection and connection state
serial_connection = None
is_connected = False
is_sending = False
was_sending = False
is_attempting_connection = False

# Output states
Dir = [True] * 8   # Initialize direction to Right
pDir = [True] * 8  # Previous direction
Pow = [3] * 8      # Initialize power level to 3 (which will display as 4)
pPow = [0] * 8     # Previous power level
On = [False] * 8   # On/off state
pOn = [False] * 8  # Previous on/off state

def find_ports():
    ports = list(serial.tools.list_ports.comports())
    for p in ports:
        try:
            ser = serial.Serial(p.device, 9600, timeout=1)
            time.sleep(2)
            ser.write(b"p\0###Do you byte, when I knock?$$$")
            time.sleep(1)
            response = ser.read_all()
            if b'###' in response:
                print(f"Interface B found on port {p.device}")
                return ser
            else:
                print(f"Incorrect port {p.device}, closing.")
                ser.close()
        except serial.SerialException as e:
            print(f"Error on port {p.device}: {e}")
    return None

def keep_alive(port):
    global is_connected  # Access the global variable
    while True:
        try:
            port.write([2])
            time.sleep(2)
        except serial.SerialException:
            is_connected = False  # Update connection status
            if port:
                port.close()  # Close the connection properly
                stop_all_motors()  # Stop all motors
                print("Connection lost. Motors stopped.")  # Log message
            break  # Exit the loop if there's an error

def send_commands():
    global is_sending, was_sending, is_connected, serial_connection  # Access the global variables
    while serial_connection:
        if is_sending:
            try:
                # Normal operation: send commands based on Dir, Pow, On
                # Send Direction commands
                for i in range(8):
                    if Dir[i] != pDir[i] or not was_sending:
                        buf = 147 if Dir[i] else 148
                        buf2 = 0x01 << i
                        dcommand = bytes([buf, buf2])
                        serial_connection.write(dcommand)
                        pDir[i] = Dir[i]

                # Send Power commands
                for i in range(8):
                    if Pow[i] != pPow[i] or not was_sending:
                        buf = 176 + Pow[i]
                        buf2 = 0x01 << i
                        pcommand = bytes([buf, buf2])
                        serial_connection.write(pcommand)
                        pPow[i] = Pow[i]

                # Send On/Off commands
                for i in range(8):
                    if On[i] != pOn[i] or not was_sending:
                        buf = 145 if On[i] else 144
                        buf2 = 0x01 << i
                        ocommand = bytes([buf, buf2])
                        serial_connection.write(ocommand)
                        pOn[i] = On[i]

            except serial.SerialException as e:
                print(f"Serial communication error: {e}")
                is_connected = False  # Update connection status
                if serial_connection:
                    serial_connection.close()  # Close the connection properly
                    serial_connection = None  # Clear the serial connection object
                break  # Exit the loop if there's an error

            # Update was_sending at the end of the loop
            was_sending = is_sending

        else:
            # Only send "turn off" command for all outputs if was_sending was previously True
            if was_sending:
                try:
                    for i in range(8):
                        buf = 144  # Command for "turn off"
                        buf2 = 0x01 << i
                        ocommand = bytes([buf, buf2])
                        serial_connection.write(ocommand)
                except serial.SerialException as e:
                    print(f"Serial communication error: {e}")
                    is_connected = False  # Update connection status
                    if serial_connection:
                        serial_connection.close()  # Close the connection properly
                        serial_connection = None  # Clear the serial connection object
                    break  # Exit the loop if there's an error
            # Update was_sending at the end of the loop
            was_sending = is_sending

        # Delay before the next iteration
        time.sleep(1)

def keep_alive(port):
    global is_connected  # Access the global variable
    while True:
        try:
            port.write([2])
            time.sleep(2)
        except serial.SerialException:
            is_connected = False  # Update connection status
            if port:
                port.close()  # Close the connection properly
            break  # Exit the loop if there's an error

@app.route('/')
def index():
    return render_template('index.html', power_levels=Pow, is_connected=is_connected)

@app.route('/toggle_connection', methods=['POST'])
def toggle_connection():
    global serial_connection, is_connected, is_sending, is_attempting_connection
    if not is_connected and not is_attempting_connection:
        is_attempting_connection = True
        try:
            serial_connection = find_ports()
            if serial_connection:
                threading.Thread(target=keep_alive, args=(serial_connection,)).start()
                threading.Thread(target=send_commands, daemon=True).start()
                is_connected = True
                print(f"Connected to {serial_connection.port}")
            else:
                is_connected = False
                print("Connection failed: No serial ports found.")
        except Exception as e:
            print(f"Connection failed: {str(e)}")
            is_connected = False
        finally:
            is_attempting_connection = False
    elif is_connected:
        stop_all_motors()
        if serial_connection:
            serial_connection.close()
            serial_connection = None
        is_connected = False
        is_sending = False
        print("Disconnected from the serial port.")
    return jsonify(is_connected=is_connected, is_sending=is_sending)

@app.route('/toggle_on/<int:output_id>', methods=['POST'])
def toggle_on(output_id):
    On[output_id - 1] = not On[output_id - 1]
    return jsonify(success=True)

@app.route('/toggle_dir/<int:output_id>', methods=['POST'])
def toggle_dir(output_id):
    global Dir, pDir
    Dir[output_id - 1] = not Dir[output_id - 1]
    pDir[output_id - 1] = not Dir[output_id - 1]  # Force update
    return jsonify(success=True)

@app.route('/increase_power/<int:output_id>', methods=['POST'])
def increase_power(output_id):
    if Pow[output_id - 1] < 7:  # Max power level is now 7
        Pow[output_id - 1] += 1
    return jsonify(success=True)

@app.route('/decrease_power/<int:output_id>', methods=['POST'])
def decrease_power(output_id):
    if Pow[output_id - 1] > 0:
        Pow[output_id - 1] -= 1
    return jsonify(success=True)

@app.route('/get_power_levels')
def get_power_levels():
    return jsonify(power_levels=Pow)

@app.route('/get_connection_status')
def get_connection_status():
    return jsonify(is_connected=is_connected)

@app.route('/get_direction_states')
def get_direction_states():
    return jsonify(direction_states=Dir)

@app.route('/get_on_off_states')
def get_on_off_states():
    return jsonify(on_off_states=On)

@app.route('/toggle_sending', methods=['POST'])
def toggle_sending():
    global is_sending
    is_sending = not is_sending
    return jsonify(is_sending=is_sending)

@app.route('/get_sending_status')
def get_sending_status():
    return jsonify(is_sending=is_sending)

@app.route('/get_output_states')
def get_output_states():
    return jsonify(on_off_states=On, direction_states=Dir, power_levels=Pow)


def save_state_to_file():
    state = {
        'On': On,
        'Dir': Dir,
        'Pow': Pow
    }
    with open('values.txt', 'w') as file:
        file.write(str(state))

@app.route('/save_state', methods=['POST'])
def save_state():
    save_state_to_file()
    return jsonify(success=True)

def load_state_from_file():
    try:
        with open('values.txt', 'r') as file:
            state = eval(file.read())
            global On, Dir, Pow
            On = state['On']
            Dir = state['Dir']
            Pow = state['Pow']
            return True
    except (FileNotFoundError, SyntaxError):
        return False

@app.route('/load_state', methods=['POST'])
def load_state():
    success = load_state_from_file()
    return jsonify(success=success)

@app.route('/check_connection')
def check_connection():
    global is_connected, is_sending  # include is_sending
    # Check if the serial connection is open
    if serial_connection and serial_connection.is_open:
        is_connected = True
    else:
        is_connected = False
        is_sending = False  # Turn off sending if connection is lost
    return jsonify(is_connected=is_connected, is_sending=is_sending)

@app.route('/get_connection_attempt_status')
def get_connection_attempt_status():
    global is_attempting_connection
    return jsonify(is_attempting_connection=is_attempting_connection)

def stop_all_motors():
    global serial_connection
    if serial_connection and serial_connection.is_open:
        try:
            for i in range(8):
                buf = 144  # Command for "turn off"
                buf2 = 0x01 << i
                ocommand = bytes([buf, buf2])
                serial_connection.write(ocommand)
                serial_connection.flush()  # Ensure the command is sent immediately
                time.sleep(0.05)  # Short delay between commands
            print("All motors stopped.")
        except serial.SerialException as e:
            print(f"Error stopping motors: {e}")

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=80, debug=True) # Port 5001 was the original one used
