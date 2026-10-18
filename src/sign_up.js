import { useState } from 'react';

function SignUp() {
  const [formData, setFormData] = useState({
    role: '',
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: ''
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
    if (!formData.role) newErrors.role = 'Please select a role';
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    if (!formData.firstName) newErrors.firstName = 'First name is required';
    if (!formData.lastName) newErrors.lastName = 'Last name is required';
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    return newErrors;
  };

  const handleSubmit = async () => {
    const newErrors = validateForm();
    if (Object.keys(newErrors).length === 0) {
      try {
        console.log('Sending data to API...');
        
        const response = await fetch('http://127.0.0.1:5000/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            role: formData.role,
            first_name: formData.firstName,
            last_name: formData.lastName,
            email_id: formData.email,
            password: formData.password
          })
        });

        console.log('Response received:', response.status);

        // Always read the response body first
        const data = await response.json();
        console.log('Response data:', data);

        if (response.ok) {
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
          localStorage.setItem('user', JSON.stringify(data.user));
          console.log('User saved to localStorage:', data.user);
          if (data.user.role === 'job_seeker') {
            window.location.href = '/candidate-profile';
          } else if (data.user.role === 'employer') {
            window.location.href = '/company-profile';
          } else {
            alert(`Technical Error: Please talk to your administrator.`);
          }
        } else {
          // Handle error response
          alert(`Signup failed: ${data.error || data.message || 'Please try again'}`);
        }
      } catch (error) {
        console.error('Fetch error:', error);
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
        <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>Create Account</h2>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Role</label>
          <select name="role" value={formData.role} onChange={handleChange} style={inputStyle('role')}>
            <option value="">Select a role</option>
            <option value="job_seeker">Job Seeker</option>
            <option value="employer">Employer</option>
          </select>
          {errors.role && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.role}</p>}
        </div>

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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>First Name</label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              placeholder="John"
              style={inputStyle('firstName')}
            />
            {errors.firstName && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.firstName}</p>}
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Last Name</label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              placeholder="Doe"
              style={inputStyle('lastName')}
            />
            {errors.lastName && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.lastName}</p>}
          </div>
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

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Confirm Password</label>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="••••••••"
            style={inputStyle('confirmPassword')}
          />
          {errors.confirmPassword && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.confirmPassword}</p>}
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
          Sign Up
        </button>

        <p style={{ textAlign: 'center', fontSize: '14px', marginTop: '24px' }}>
          Already have an account? <span style={{ color: '#2563eb', cursor: 'pointer' }} onClick={() => window.location.href = '/login'}>Log in</span>
        </p>
      </div>
    </div>
  );
}

export default SignUp;
