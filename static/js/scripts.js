var isConnected = false;  // Initialize the isConnected variable
var isAttemptingConnection = false; // Global flag to track connection attempts
var isDisconnecting = false; // Global flag to track disconnection attempts
var is_sending = false; // Initialize the is_sending variable if needed

function sendCommand(url, output_id) {
    if (url === '/toggle_connection' && !isConnected) {
        checkConnectionAttemptStatus(function (isAttempting) {
            if (isAttempting) {
                alert('Control Lab IO is currently in the process of establishing a connection with the LEGO Interface B.');
                document.getElementById('focus-target').focus();
            } else {
                // Immediate UI feedback for attempting to connect
                var connectionButton = document.getElementById('connection-btn');
                var connectionIcon = document.getElementById('connection-icon');
                connectionButton.classList.add('btn-black-theme', 'pulse', 'disable-pointer');
                connectionButton.classList.remove('red', 'green');
                connectionIcon.textContent = 'link'; // Assuming 'link' is the icon for attempting to connect
                isAttemptingConnection = true; // Assuming you track connection attempt status

                // Proceed with the actual connection attempt
                proceedWithConnectionAttempt(url, output_id);
            }
        });
    } else {
        // For disconnection and all other commands, proceed as before
        var xhr = new XMLHttpRequest();
        xhr.open("POST", url, true);
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        xhr.onload = function () {
            console.log('Command sent: ' + url);
            if (output_id === 0) {
                if (url === '/toggle_connection' && isConnected) {
                    // Your original disconnection logic...
                    handleDisconnection(); // Make sure this function is defined as per your original logic
                } else {
                    updateConnectionStatus(); // Update the connection status accordingly
                }
            } else {
                // Handling for other commands remains unchanged
                updateButtonStates(output_id);
                updateDirectionLabels();
                updateOnOffLabels();
            }
        };
        xhr.send();
    }
}

function handleDisconnection() {
    isDisconnecting = true;
    var connectionButton = document.getElementById('connection-btn');
    var connectionIcon = document.getElementById('connection-icon');
    connectionButton.classList.add('btn-black-theme', 'pulse');
    connectionButton.classList.remove('green', 'red');
    connectionIcon.textContent = 'link_off';
    connectionButton.disabled = true;

    updateButtonAccessibility(false);

    // Disable power control buttons immediately
    for (var i = 1; i <= 8; i++) {
        document.getElementById('increase-' + i).disabled = true;
        document.getElementById('decrease-' + i).disabled = true;
    }

    // Update the sending button icon to indicate sending is paused/stopped
    var sendingButton = document.getElementById('sending-btn');
    var sendingIcon = document.getElementById('sending-icon');
    sendingIcon.textContent = 'pause'; // Update to reflect the paused/stopped state
    sendingButton.classList.add('orange'); // Change color to indicate paused/stopped state
    sendingButton.classList.remove('green', 'pulse'); // Remove classes that indicate active sending

    // Immediately update on/off buttons to reflect they are disabled
    for (var i = 1; i <= 8; i++) {
        var onOffButton = document.getElementById('on-off-' + i);
        onOffButton.classList.add('red'); // Use red to indicate off or disabled
        onOffButton.classList.remove('green', 'orange', 'pulse'); // Remove any classes that indicate on or active state
    }

    // Wait for 6 seconds before resetting the disconnecting state and updating the UI
    setTimeout(function () {
        // Send a request to the server to confirm if the connection has been successfully closed
        var checkConnectionXhr = new XMLHttpRequest();
        checkConnectionXhr.open("GET", "/get_connection_status", true);
        checkConnectionXhr.onload = function () {
            var statusData = JSON.parse(checkConnectionXhr.responseText);
            if (!statusData.is_connected) {
                // Successfully disconnected
                isDisconnecting = false; // Reset disconnecting flag
                connectionButton.disabled = false; // Re-enable the button
                updateConnectionStatus(); // Reflect disconnected state in the UI
            } else {
                // Handle unsuccessful disconnection, e.g., retry or notify user
                console.error("Disconnection failed, retrying...");
                // Optionally, insert retry logic or user notification here
            }
        };
        checkConnectionXhr.send();
    }, 6000); // Check status after 6 seconds delay
}

function checkConnectionAttemptStatus(callback) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "/get_connection_attempt_status", true);
    xhr.onload = function () {
        var status = JSON.parse(xhr.responseText);
        callback(status.is_attempting_connection);
    };
    xhr.send();
}

function proceedWithConnectionAttempt(url, output_id) {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.onload = function () {
        // Debug message to log the server's response
        console.log('Server response: ', xhr.responseText);

        var response = JSON.parse(xhr.responseText);
        // Use the is_connected field from the server's response
        if (response.is_connected) {
            // The connection attempt was successful based on the is_connected flag
            isAttemptingConnection = false; // Reset this flag once the attempt is complete
            isConnected = true; // Update the isConnected flag based on the server's response
            updateConnectionStatus(); // Reflect the new connection status in the UI
            // Additional logic for different output_id values
            if (output_id === 0) {
                // Additional logic if needed
            } else {
                updateButtonStates(output_id);
                updateDirectionLabels();
                updateOnOffLabels();
            }
        } else {
            // The connection attempt failed or the server's response did not indicate a connection
            isAttemptingConnection = false; // Reset attempt flag
            isConnected = false; // Ensure isConnected reflects the failed attempt
            handleFailedConnection(); // Handle the failed connection case
        }
    };
    xhr.onerror = function () {
        // Network error or server did not respond
        isAttemptingConnection = false; // Reset attempt flag
        isConnected = false; // Reflect network error as not connected
        handleFailedConnection(); // Handle the failed connection case
        console.error('Network error or no response from server');
    };
    xhr.send();
}

function handleFailedConnection() {
    // Function to handle UI changes for failed connection attempt
    var connectionButton = document.getElementById('connection-btn');
    var connectionIcon = document.getElementById('connection-icon');

    connectionButton.classList.add('red');
    connectionButton.classList.remove('btn-black-theme', 'pulse', 'disable-pointer', 'green');
    connectionIcon.textContent = 'refresh'; // Change icon to 'refresh' to indicate failure

    alert('It looks like Control Lab IO is having trouble connecting to the LEGO Interface B right now. Please try again.');

    // Shift focus to the hidden element after the alert
    document.getElementById('focus-target').focus();
}

function updateButtonStates() {
    var xhrPowerLevels = new XMLHttpRequest();
    xhrPowerLevels.open("GET", "/get_power_levels", true);
    xhrPowerLevels.onload = function () {
        var dataPower = JSON.parse(xhrPowerLevels.responseText);
        var powerLevels = dataPower.power_levels;

        for (var i = 1; i <= 8; i++) {
            var powerLevelIcon = 'counter_' + (powerLevels[i - 1] + 1);
            document.getElementById('power-level-' + i).innerHTML = '<span class="material-symbols-outlined">' + powerLevelIcon + '</span>';
            // Enable/disable increase and decrease buttons based only on connection status and power levels
            document.getElementById('increase-' + i).disabled = !isConnected || (powerLevels[i - 1] == 7);
            document.getElementById('decrease-' + i).disabled = !isConnected || (powerLevels[i - 1] == 0);
        }
    };
    xhrPowerLevels.send();
}

function updateDirectionLabels() {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "/get_direction_states", true);
    xhr.onload = function () {
        var data = JSON.parse(xhr.responseText);
        var directionStates = data.direction_states;

        for (var i = 1; i <= 8; i++) {
            var directionIcon = document.getElementById('direction-icon-' + i);
            if (directionStates[i - 1]) {
                directionIcon.textContent = 'rotate_right'; // Icon for "Right"
            } else {
                directionIcon.textContent = 'rotate_left'; // Icon for "Left"
            }
        }
    };
    xhr.send();
}

function updateOnOffLabels() {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "/get_on_off_states", true);
    xhr.onload = function () {
        var data = JSON.parse(xhr.responseText);
        console.log("Received On/Off States:", data);  // Debugging line
        var onOffStates = data.on_off_states;

        for (var i = 1; i <= 8; i++) {
            var onOffButton = document.getElementById('on-off-' + i);
            var onOffLabel = onOffStates[i - 1] ? 'On' : 'Off';
            onOffButton.textContent = onOffLabel;

            onOffButton.classList.remove('red', 'green', 'orange', 'pulse'); // Remove all classes
            if (onOffLabel === 'On') {
                if (is_sending) {
                    onOffButton.classList.add('green');
                    if (is_sending) onOffButton.classList.add('pulse');  // Add pulse only if is_sending is true
                } else {
                    onOffButton.classList.add('orange');
                }
            } else {
                onOffButton.classList.add('red');
            }
        }

        // Call updateButtonStates after updating on-off labels to ensure buttons reflect the new on-off states
        updateButtonStates();
    };
    xhr.send();
}

function updateConnectionStatus() {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "/get_connection_status", true);
    xhr.onload = function () {
        var data = JSON.parse(xhr.responseText);
        var connectionButton = document.getElementById('connection-btn');
        var connectionIcon = document.getElementById('connection-icon');

        if (data.is_connected) {
            // "Connected" state
            connectionButton.classList.add('green');
            connectionButton.classList.remove('btn-black-theme', 'red', 'pulse', 'disable-pointer'); // Also re-enable pointer events
            connectionIcon.textContent = 'power_settings_new';
            isConnected = true;
        } else {
            if (isDisconnecting) {
                // "Is Disconnecting" state
                connectionButton.classList.add('btn-black-theme', 'pulse');
                connectionButton.classList.remove('green', 'red');
                connectionIcon.textContent = 'link_off';
            } else if (isAttemptingConnection) {
                // Here, you check if the attempt to connect has failed
                // "No connection found" state should be handled here
                connectionButton.classList.add('red');
                connectionButton.classList.remove('btn-black-theme', 'green', 'pulse', 'disable-pointer');
                connectionIcon.textContent = 'refresh'; // Indicate no connection found
                // Optionally, you can add a delay or a mechanism to revert the icon back to 'link' after some time
            } else {
                // "Default / Disconnected" state
                connectionButton.classList.add('btn-black-theme');
                connectionButton.classList.remove('green', 'red', 'pulse', 'disable-pointer');
                connectionIcon.textContent = 'link';
            }
            isConnected = false;
        }

        isAttemptingConnection = false;
        // Do not reset isDisconnecting here; let the setTimeout handle it to respect the 6-second duration

        // Only re-enable the button if not in the process of disconnecting
        if (!isDisconnecting) {
            connectionButton.disabled = false;
        }

        updateButtonAccessibility(data.is_connected);
        updateButtonStates();

        // Now also handle sending status
        is_sending = data.is_sending;  // Update is_sending based on the server response
        updateSendingStatus();  // Update the sending button UI
    };
    xhr.send();
}

function toggleSending() {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/toggle_sending", true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.onload = function () {
        console.log('Sending state toggled');
        updateSendingStatus();
    };
    xhr.send();
}

function updateSendingStatus() {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "/get_sending_status", true);
    xhr.onload = function () {
        var data = JSON.parse(xhr.responseText);
        is_sending = data.is_sending;  // Update the is_sending variable
        var sendingButton = document.getElementById('sending-btn');
        var sendingIcon = document.getElementById('sending-icon');

        // Update button classes and icon based on sending status
        if (is_sending) {
            sendingButton.classList.add('green', 'pulse'); // Add green color and pulse effect
            sendingButton.classList.remove('btn-black-theme', 'orange'); // Remove btn-black-theme and orange color
            sendingIcon.textContent = 'play_arrow'; // Use the play_arrow icon

            // Change any orange on/off buttons to green and add pulse
            for (var i = 1; i <= 8; i++) {
                var onOffButton = document.getElementById('on-off-' + i);
                if (onOffButton.textContent === 'On') {
                    onOffButton.classList.add('green', 'pulse');
                    onOffButton.classList.remove('orange');
                }
            }
        } else {
            sendingButton.classList.add('orange'); // Add orange color
            sendingButton.classList.remove('green', 'btn-black-theme', 'pulse'); // Remove green color, btn-black-theme color, and pulse effect
            sendingIcon.textContent = 'pause'; // Use the pause icon

            // Change any green on/off buttons to orange and remove pulse
            for (var i = 1; i <= 8; i++) {
                var onOffButton = document.getElementById('on-off-' + i);
                if (onOffButton.textContent === 'On') {
                    onOffButton.classList.add('orange');
                    onOffButton.classList.remove('green', 'pulse');
                }
            }
        }
    };
    xhr.send();
}

// Global variable to store the saved state
var savedState = {
    On: [],
    Dir: [],
    Pow: []
};

function saveOutputValues() {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/save_state", true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.onload = function () {
        if (xhr.status === 200) {
            console.log("State saved successfully.");
        } else {
            console.log("Failed to save state.");
        }
    };
    xhr.send();
}

function loadOutputValues() {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/load_state", true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.onload = function () {
        if (xhr.status === 200) {
            console.log("State loaded successfully.");
            // Update UI based on the loaded state
            updateButtonStates(0);
            updateDirectionLabels();
            updateOnOffLabels();
        } else {
            console.log("Failed to load state.");
        }
    };
    xhr.send();
}

function updateButtonAccessibility(isConnected) {
    var buttons = document.querySelectorAll('.btn-floating'); // Select all floating buttons
    var outputLabels = document.querySelectorAll('.output-label'); // Select all output labels
    var powerIcons = document.querySelectorAll('.power-level-display'); // Select all power level display icons

    buttons.forEach(function (button) {
        // Exclude the theme toggle button from being disabled
        if (button.id !== 'connection-btn' && button.id !== 'theme-toggle-btn') {
            button.disabled = !isConnected;
        }
    });

    // Use CSS classes for color change based on connection status
    outputLabels.forEach(function (label) {
        if (!isConnected) {
            label.classList.add('disconnected-label');
        } else {
            label.classList.remove('disconnected-label');
        }
    });

    powerIcons.forEach(function (icon) {
        if (!isConnected) {
            icon.classList.add('disconnected-icon');
        } else {
            icon.classList.remove('disconnected-icon');
        }
    });
}

// Function to check the connection status periodically
function periodicallyCheckConnection() {
    setInterval(function () {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", "/check_connection", true);
        xhr.onload = function () {
            var data = JSON.parse(xhr.responseText);

            // If the connection was lost and now it's back
            if (data.is_connected && !isConnected) {
                isConnected = true;
                is_sending = data.is_sending; // Update is_sending based on the server response
                updateConnectionStatus(); // Update UI to reflect connection is back
                updateButtonAccessibility(isConnected);
                updateSendingStatus(); // Update the sending button UI
            }

            // If the connection was there and now it's lost
            else if (!data.is_connected && isConnected) {
                isConnected = false;
                is_sending = data.is_sending; // Update is_sending based on the server response
                updateConnectionStatus(); // Update UI to reflect connection is lost
                updateButtonAccessibility(isConnected);
                updateSendingStatus(); // Update the sending button UI
            }

            // Regardless of connection status, update the UI with the latest system states
            updateOnOffLabels();
            updateDirectionLabels();
            updateButtonStates();
            updateSendingStatus();  // Make sure this is called here to update sending status regularly
        };
        xhr.send();
    }, 1000); // Check every 1000 milliseconds (1 second)
}

window.onload = function () {
    // Fetch and set the initial state of is_sending
    updateSendingStatus(); // Fetch and update sending status on page load

    // Update other UI elements based on the initial state
    updateButtonStates(0);
    updateConnectionStatus();
    updateDirectionLabels();
    updateOnOffLabels();

    // Initially, assume disconnected and disable buttons
    updateButtonAccessibility(false);
    // Start checking the connection status periodically
    periodicallyCheckConnection();

};

window.addEventListener('load', () => {
    requestAnimationFrame(() => {
        document.body.classList.remove('no-transition');
    });
});

document.addEventListener('DOMContentLoaded', function () {
    var buttons = document.querySelectorAll('.btn-floating, .btn-large');

    buttons.forEach(function (button) {
        // Apply lighter opacity on focus
        button.addEventListener('focus', function () {
            if (!button.classList.contains('mouse-focused')) {
                this.classList.add('focused');
            }
        });

        // Remove lighter opacity when not focused
        button.addEventListener('blur', function () {
            this.classList.remove('focused');
        });

        // On mouse down, add 'mouse-focused' to prevent focus style
        button.addEventListener('mousedown', function (event) {
            this.classList.add('mouse-focused');
        });

        // On mouse up, remove 'mouse-focused' and optionally blur the button
        button.addEventListener('mouseup', function () {
            this.classList.remove('mouse-focused');
            // If you decide to keep the focus on the button after click, comment out the next line
            // this.blur(); // Blurring might affect accessibility, consider your use case
        });

        // Handle keydown for Space and Enter to show visual feedback without losing focus
        button.addEventListener('keydown', function (event) {
            if (event.key === ' ' || event.key === 'Enter') {
                event.preventDefault(); // Prevent default action, like page scrolling for Space key
                this.classList.add('active'); // Add 'active' for the scale effect
            }
        });

        // Remove the visual feedback when the key is released and simulate a click
        button.addEventListener('keyup', function (event) {
            if (event.key === ' ' || event.key === 'Enter') {
                this.classList.remove('active'); // Remove 'active' to revert the scale effect
                this.click(); // Simulate click for Space and Enter keyup
            }
        });
    });

    // Listen for visibility change
    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') {
            window.scrollTo(0, 0); // Scrolls to the top of the page
            // When the page becomes visible, set focus to the specific element
            document.getElementById('focus-target').focus();
        }
    });
});

document.addEventListener('DOMContentLoaded', function () {
    const sentinel = document.getElementById('sticky-sentinel');
    const container = document.querySelector('.connection-container');

    let observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) {
                container.classList.add('has-shadow');
            } else {
                container.classList.remove('has-shadow');
            }
        });
    }, {
        threshold: [1.0] // 1.0 means when 100% of the sentinel is out of view
    });

    observer.observe(sentinel);
});
