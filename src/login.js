import { useState } from 'react';

function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }
    return newErrors;
  };

  const handleSubmit = async () => {
    const newErrors = validateForm();
    if (Object.keys(newErrors).length === 0) {
      try {
        console.log('Logging in...');
        
        const response = await fetch('http://127.0.0.1:5000/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email_id: formData.email,
            password: formData.password
          })
        });

        console.log('Response received:', response.status);
        
        const data = await response.json();
        console.log('Response data:', data);
        
        if (response.ok) {
          localStorage.setItem('user', JSON.stringify(data.user));
          console.log('User saved to localStorage:', data.user);
          if (data.user.role === 'job_seeker') {
            window.location.href = '/candidate-search';
          } else if (data.user.role === 'employer') {
            window.location.href = '/employer-dashboard';
          } else {
            alert(`Technical Error: Please talk to your administrator.`);
          }
        } else {
          alert(`Login failed: ${data.error || 'Invalid credentials'}`);
        }
      } catch (error) {
        console.error('Login error:', error);
        alert('Network error. Please check your connection and try again.');
      }
    } else {
      setErrors(newErrors);
    }

  };


  const inputStyle = (fieldName) => ({
    width: '100%',
    padding: '10px',
    border: `1px solid ${errors[fieldName] ? '#ef4444' : '#ddd'}`,
    borderRadius: '6px',
    fontSize: '14px',
    boxSizing: 'border-box'
  });

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #e0f2fe 0%, #ddd6fe 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        padding: '32px',
        width: '100%',
        maxWidth: '450px'
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: '8px', fontSize: '28px', fontWeight: 'bold' }}>Welcome Back</h2>
        <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: '24px' }}>Log in to your account</p>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="you@example.com"
            style={inputStyle('email')}
          />
          {errors.email && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.email}</p>}
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Password</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••••"
            style={inputStyle('password')}
          />
          {errors.password && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.password}</p>}
        </div>

        <div style={{ textAlign: 'right', marginBottom: '16px' }}>
          <span style={{ color: '#2563eb', fontSize: '14px', cursor: 'pointer' }}>Forgot password?</span>
        </div>

        <button
          onClick={handleSubmit}
          style={{
            width: '100%',
            backgroundColor: '#2563eb',
            color: 'white',
            padding: '10px',
            borderRadius: '6px',
            border: 'none',
            fontSize: '16px',
            fontWeight: '500',
            cursor: 'pointer',
            marginTop: '8px'
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#1d4ed8'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#2563eb'}
        >
          Log In
        </button>

        <p style={{ textAlign: 'center', fontSize: '14px', marginTop: '24px', color: '#6b7280' }}>
          Don't have an account? <span style={{ color: '#2563eb', cursor: 'pointer', fontWeight: '500' }} onClick={() => window.location.href = '/signup'}>Sign up</span>
        </p>
      </div>
    </div>
  );
}

export default Login;