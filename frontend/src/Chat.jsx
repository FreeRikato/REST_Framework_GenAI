import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import './Chatbot.css';

const Chatbot = () => {
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Hello! How can I assist you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const bufferRef = useRef('');
  const timeoutRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const updateMessage = () => {
    setMessages(prevMessages => {
      const updatedMessages = [...prevMessages];
      const lastMessage = updatedMessages[updatedMessages.length - 1];
      if (lastMessage.sender === 'bot') {
        lastMessage.text += bufferRef.current;
      }
      bufferRef.current = '';
      return updatedMessages;
    });
  };

  const handleSend = async () => {
    if (input.trim() === '' || isLoading) return;

    setMessages(prevMessages => [
      ...prevMessages,
      { sender: 'user', text: input }
    ]);

    setInput('');
    setIsLoading(true);

    const newBotMessage = { sender: 'bot', text: '' };
    setMessages(prevMessages => [...prevMessages, newBotMessage]);

    const eventSource = new EventSource(`http://localhost:8000/api/chat-stream/?prompt=${encodeURIComponent(input)}`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.content !== undefined) {
        bufferRef.current += data.content;
        
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        timeoutRef.current = setTimeout(() => {
          updateMessage();
        }, 1); // 50ms delay, adjust as needed
      }
    };
    
    eventSource.onerror = (error) => {
      console.error('EventSource failed:', error);
      eventSource.close();
      setIsLoading(false);
      updateMessage(); // Ensure any remaining buffer is displayed
    };
    
    eventSource.addEventListener('stream-ended', () => {
      eventSource.close();
      setIsLoading(false);
      updateMessage(); // Ensure any remaining buffer is displayed
    });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div className="chatbot-container">
      <div className="chat-messages">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.sender === 'user' ? 'user-message' : 'bot-message'}`}>
            {msg.sender === 'bot' && <div className="bot-icon">AI</div>}
            <div className="message-content">
              {msg.sender === 'user' ? (
                msg.text
              ) : (
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-input">
        <input
          type="text"
          placeholder="Message ChatGPT"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isLoading}
        />
        <button onClick={handleSend} disabled={isLoading}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Chatbot;