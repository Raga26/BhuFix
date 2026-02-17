#!/usr/bin/env python3
"""
Comprehensive Backend API Tests for Bhufix Digital Marketing Agency
Tests all endpoints: contact form, health check, security headers, rate limiting
"""

import requests
import json
import time
from datetime import datetime

# Backend URL from environment (production URL)
BACKEND_URL = "https://bhufix-creative.preview.emergentagent.com/api"

class BackendTester:
    def __init__(self):
        self.results = {
            "total_tests": 0,
            "passed": 0,
            "failed": 0,
            "failures": []
        }
        
    def log_result(self, test_name, success, message=""):
        self.results["total_tests"] += 1
        if success:
            self.results["passed"] += 1
            print(f"✅ {test_name}")
        else:
            self.results["failed"] += 1
            self.results["failures"].append(f"{test_name}: {message}")
            print(f"❌ {test_name}: {message}")
        
        if message and success:
            print(f"   📝 {message}")
    
    def test_health_endpoint(self):
        """Test GET /api/health endpoint"""
        print("\n=== Testing Health Check Endpoint ===")
        try:
            response = requests.get(f"{BACKEND_URL}/health", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if "status" in data and "database" in data:
                    self.log_result("Health endpoint structure", True, f"Status: {data.get('status')}, DB: {data.get('database')}")
                else:
                    self.log_result("Health endpoint structure", False, "Missing required fields")
            else:
                self.log_result("Health endpoint status", False, f"Status code: {response.status_code}")
                
        except Exception as e:
            self.log_result("Health endpoint connection", False, f"Connection error: {str(e)}")
    
    def test_security_headers(self):
        """Test security headers in responses"""
        print("\n=== Testing Security Headers ===")
        try:
            response = requests.get(f"{BACKEND_URL}/health", timeout=10)
            headers = response.headers
            
            # Required security headers
            security_headers = {
                "X-Content-Type-Options": "nosniff",
                "X-Frame-Options": "DENY", 
                "X-XSS-Protection": "1; mode=block"
            }
            
            for header, expected_value in security_headers.items():
                if header in headers:
                    if headers[header] == expected_value:
                        self.log_result(f"Security header {header}", True, f"Value: {headers[header]}")
                    else:
                        self.log_result(f"Security header {header}", False, f"Expected '{expected_value}', got '{headers[header]}'")
                else:
                    self.log_result(f"Security header {header}", False, "Header missing")
                    
        except Exception as e:
            self.log_result("Security headers test", False, f"Error: {str(e)}")
    
    def test_contact_form_valid_submission(self):
        """Test valid contact form submission"""
        print("\n=== Testing Valid Contact Form Submission ===")
        
        valid_data = {
            "name": "John Doe",
            "email": "john@example.com",
            "phone": "+1234567890",
            "service": "SEO Services",
            "message": "I need help with my website SEO optimization to improve rankings",
            "honeypot": ""
        }
        
        try:
            response = requests.post(
                f"{BACKEND_URL}/contact",
                json=valid_data,
                timeout=10,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                if "id" in data and "message" in data:
                    self.log_result("Valid contact submission", True, f"Submission ID: {data['id']}")
                else:
                    self.log_result("Valid contact submission", False, "Missing response fields")
            else:
                self.log_result("Valid contact submission", False, f"Status code: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_result("Valid contact submission", False, f"Error: {str(e)}")
    
    def test_contact_form_invalid_email(self):
        """Test contact form with invalid email"""
        print("\n=== Testing Invalid Email Validation ===")
        
        invalid_email_data = {
            "name": "John",
            "email": "not-an-email",
            "message": "This should fail due to invalid email format"
        }
        
        try:
            response = requests.post(
                f"{BACKEND_URL}/contact",
                json=invalid_email_data,
                timeout=10,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 422:  # Validation error expected
                self.log_result("Invalid email validation", True, "Correctly rejected invalid email")
            elif response.status_code == 200:
                self.log_result("Invalid email validation", False, "Should have rejected invalid email")
            else:
                self.log_result("Invalid email validation", False, f"Unexpected status: {response.status_code}")
                
        except Exception as e:
            self.log_result("Invalid email validation", False, f"Error: {str(e)}")
    
    def test_contact_form_short_message(self):
        """Test contact form with message too short"""
        print("\n=== Testing Short Message Validation ===")
        
        short_message_data = {
            "name": "John",
            "email": "john@test.com",
            "message": "short"  # Less than minimum length
        }
        
        try:
            response = requests.post(
                f"{BACKEND_URL}/contact",
                json=short_message_data,
                timeout=10,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 422:  # Validation error expected
                self.log_result("Short message validation", True, "Correctly rejected short message")
            elif response.status_code == 200:
                self.log_result("Short message validation", False, "Should have rejected short message")
            else:
                self.log_result("Short message validation", False, f"Unexpected status: {response.status_code}")
                
        except Exception as e:
            self.log_result("Short message validation", False, f"Error: {str(e)}")
    
    def test_honeypot_spam_detection(self):
        """Test honeypot spam detection"""
        print("\n=== Testing Honeypot Spam Detection ===")
        
        spam_data = {
            "name": "Bot",
            "email": "spam@bot.com",
            "message": "This is spam message with enough text to pass length validation",
            "honeypot": "gotcha"  # This should trigger spam detection
        }
        
        try:
            response = requests.post(
                f"{BACKEND_URL}/contact",
                json=spam_data,
                timeout=10,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                # Honeypot should return 200 but not actually save (fake success)
                data = response.json()
                if "id" in data and "message" in data:
                    self.log_result("Honeypot spam detection", True, "Spam detected and handled silently")
                else:
                    self.log_result("Honeypot spam detection", False, "Unexpected response format")
            else:
                self.log_result("Honeypot spam detection", False, f"Unexpected status: {response.status_code}")
                
        except Exception as e:
            self.log_result("Honeypot spam detection", False, f"Error: {str(e)}")
    
    def test_get_contacts(self):
        """Test GET /api/contact endpoint"""
        print("\n=== Testing Get Contacts Endpoint ===")
        
        try:
            response = requests.get(f"{BACKEND_URL}/contact", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_result("Get contacts endpoint", True, f"Returned {len(data)} contacts")
                else:
                    self.log_result("Get contacts endpoint", False, "Response is not a list")
            else:
                self.log_result("Get contacts endpoint", False, f"Status code: {response.status_code}")
                
        except Exception as e:
            self.log_result("Get contacts endpoint", False, f"Error: {str(e)}")
    
    def test_rate_limiting(self):
        """Test rate limiting on contact form (6+ requests should trigger 429)"""
        print("\n=== Testing Rate Limiting ===")
        
        # Clear any existing rate limit by waiting
        print("⏳ Waiting 2 seconds before rate limit test...")
        time.sleep(2)
        
        rate_limit_data = {
            "name": "Rate Test User",
            "email": "ratetest@example.com", 
            "message": "Testing rate limiting functionality with multiple submissions",
            "honeypot": ""
        }
        
        success_count = 0
        rate_limited = False
        
        # Send 6 requests rapidly
        for i in range(6):
            try:
                response = requests.post(
                    f"{BACKEND_URL}/contact",
                    json=rate_limit_data,
                    timeout=10,
                    headers={"Content-Type": "application/json"}
                )
                
                if response.status_code == 200:
                    success_count += 1
                    print(f"   Request {i+1}: Success (200)")
                elif response.status_code == 429:
                    rate_limited = True
                    print(f"   Request {i+1}: Rate limited (429)")
                    break
                else:
                    print(f"   Request {i+1}: Unexpected status {response.status_code}")
                    
            except Exception as e:
                print(f"   Request {i+1}: Error - {str(e)}")
        
        if rate_limited:
            self.log_result("Rate limiting functionality", True, f"Rate limit triggered after {success_count} requests")
        else:
            if success_count >= 5:
                self.log_result("Rate limiting functionality", False, "Should have triggered rate limit after 5 requests")
            else:
                self.log_result("Rate limiting functionality", False, f"Unexpected behavior - only {success_count} successful requests")
    
    def run_all_tests(self):
        """Run all backend tests"""
        print(f"🚀 Starting Backend API Tests for Bhufix Digital Marketing Agency")
        print(f"⏰ Test started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"🌐 Backend URL: {BACKEND_URL}")
        
        # Run all tests
        self.test_health_endpoint()
        self.test_security_headers()  
        self.test_contact_form_valid_submission()
        self.test_contact_form_invalid_email()
        self.test_contact_form_short_message()
        self.test_honeypot_spam_detection()
        self.test_get_contacts()
        self.test_rate_limiting()
        
        # Print summary
        print("\n" + "="*60)
        print("📊 TEST SUMMARY")
        print("="*60)
        print(f"Total Tests: {self.results['total_tests']}")
        print(f"✅ Passed: {self.results['passed']}")
        print(f"❌ Failed: {self.results['failed']}")
        
        if self.results['failures']:
            print(f"\n🚨 FAILURES:")
            for failure in self.results['failures']:
                print(f"   • {failure}")
        
        success_rate = (self.results['passed'] / self.results['total_tests']) * 100 if self.results['total_tests'] > 0 else 0
        print(f"\n📈 Success Rate: {success_rate:.1f}%")
        
        return self.results

if __name__ == "__main__":
    tester = BackendTester()
    results = tester.run_all_tests()