document.addEventListener('DOMContentLoaded', function() {
    const chatSocket = new WebSocket('ws://localhost:8081');
    const messagesContainer = document.getElementById('chat-messages');
    const messageInput = document.getElementById('chat-message');
    const sendButton = document.getElementById('chat-send');
    const usernameInput = document.getElementById('chat-username');
    const disconnectButton = document.getElementById('chat-disconnect');

    let username = '';

    chatSocket.onopen = () => {
        console.log('Connected to chat server');
    };

    chatSocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'system') {
            addMessage('system', data.message);
        } 
        else if (data.type === 'history') {
            data.messages.forEach(msg => {
                addMessage(msg.username, msg.text, new Date(msg.timestamp));
            });
        }
        else if (data.type === 'message') {
            addMessage(data.username, data.text, new Date(data.timestamp));
        }
    };

    chatSocket.onclose = () => {
        addMessage('system', 'Вы отключены от чата');
        messageInput.disabled = true;
        sendButton.disabled = true;
    };

    usernameInput.addEventListener('change', () => {
        username = usernameInput.value.trim();
        if (username) {
            chatSocket.send(JSON.stringify({
                type: 'setUsername',
                username: username
            }));
            messageInput.disabled = false;
            sendButton.disabled = false;
            messageInput.focus();
        }
    });

    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    disconnectButton.addEventListener('click', () => {
        chatSocket.close();
    });

    function sendMessage() {
        const message = messageInput.value.trim();
        if (message) {
            chatSocket.send(JSON.stringify({
                type: 'message',
                text: message
            }));
            messageInput.value = '';
        }
    }

    function addMessage(sender, text, timestamp = new Date()) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        
        if (sender === 'system') {
            messageElement.classList.add('system-message');
            messageElement.innerHTML = `<em>${text}</em>`;
        } else {
            messageElement.innerHTML = `
                <span class="message-time">[${timestamp.toLocaleTimeString()}]</span>
                <strong class="message-sender">${sender}:</strong>
                <span class="message-text">${text}</span>
            `;
        }
        
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
});