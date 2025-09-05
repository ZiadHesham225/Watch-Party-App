import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { User, Mail, Lock, UserCheck } from 'lucide-react';
import Input from '../common/Input';
import Button from '../common/Button';
import toast from 'react-hot-toast';

const RegisterForm: React.FC = () => {
  const [formData, setFormData] = useState({
    displayName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      await register({
        displayName: formData.displayName,
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });
      
      toast.success('Account created successfully! Please log in.');
      navigate('/login');
    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const isFormValid = Object.values(formData).every(value => value.trim() !== '');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Sign in here
            </Link>
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Input
              label="Display Name"
              type="text"
              name="displayName"
              value={formData.displayName}
              onChange={handleChange}
              icon={UserCheck}
              placeholder="How others will see you"
              required
            />
            
            <Input
              label="Username"
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              icon={User}
              placeholder="Choose a username"
              required
            />
            
            <Input
              label="Email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              icon={Mail}
              placeholder="Enter your email"
              required
            />
            
            <Input
              label="Password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              icon={Lock}
              placeholder="Choose a password"
              required
            />
            
            <Input
              label="Confirm Password"
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              icon={Lock}
              placeholder="Confirm your password"
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            isLoading={isLoading}
            disabled={!isFormValid}
          >
            Create Account
          </Button>
        </form>
      </div>
    </div>
  );
};

export default RegisterForm;
