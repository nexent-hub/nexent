#!/usr/bin/env python3
"""
Unit Test Runner with Coverage Report
"""

import os
import sys
import subprocess
import unittest
import importlib.util
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

def install_coverage():
    """Install coverage package if not available"""
    try:
        import coverage
        return True
    except ImportError:
        print("Coverage package not found. Installing...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "coverage"])
            return True
        except subprocess.CalledProcessError:
            print("Failed to install coverage package")
            return False

def discover_test_files():
    """Discover all test files in the test directory"""
    test_dir = Path(__file__).parent
    test_files = []
    
    for root, dirs, files in os.walk(test_dir):
        for file in files:
            if file.startswith('test_') and file.endswith('.py'):
                test_files.append(os.path.join(root, file))
    
    return test_files

def load_test_modules():
    """Load test modules and create test suite"""
    test_files = discover_test_files()
    suite = unittest.TestSuite()
    test_dir = Path(__file__).parent
    
    for test_file in test_files:
        try:
            # Get relative path and convert to module name
            rel_path = os.path.relpath(test_file, test_dir)
            module_name = rel_path.replace(os.sep, '.').replace('.py', '')
            
            # Load the module
            spec = importlib.util.spec_from_file_location(module_name, test_file)
            if spec and spec.loader:
                module = importlib.util.module_from_spec(spec)
                sys.modules[module_name] = module
                spec.loader.exec_module(module)
                
                # Find test classes in the module
                for name in dir(module):
                    obj = getattr(module, name)
                    if (isinstance(obj, type) and 
                        issubclass(obj, unittest.TestCase) and 
                        obj != unittest.TestCase):
                        # Add all test methods from this class
                        tests = unittest.TestLoader().loadTestsFromTestCase(obj)
                        suite.addTest(tests)
                        
        except Exception as e:
            print(f"Warning: Could not load test module {test_file}: {e}")
            continue
    
    return suite

def run_tests_with_coverage():
    """Run all tests with coverage measurement"""
    print("=" * 60)
    print("Running Unit Tests with Coverage")
    print("=" * 60)
    
    test_dir = Path(__file__).parent
    
    # Check if coverage is available
    if not install_coverage():
        print("Running tests without coverage...")
        return run_tests_without_coverage()
    
    try:
        import coverage
        
        # Initialize coverage with better configuration
        cov = coverage.Coverage(
            source=[
                str(project_root / 'backend'),  # Backend directory
                str(project_root / 'sdk')       # SDK directory
            ],
            omit=[
                '*/test*',
                '*/tests/*',
                '*/__pycache__/*',
                '*/venv/*',
                '*/env/*',
                '*/.venv/*',
                '*/__init__.py'  # Exclude empty __init__.py files from coverage
            ],
            config_file=False  # Don't use config file, use programmatic config
        )
        
        # Start coverage measurement
        cov.start()
        
        # Load and run tests
        suite = load_test_modules()
        
        # Run tests
        runner = unittest.TextTestRunner(verbosity=2)
        result = runner.run(suite)
        
        # Stop coverage measurement
        cov.stop()
        cov.save()
        
        # Generate coverage report
        print("\n" + "=" * 60)
        print("Coverage Report")
        print("=" * 60)
        
        # Console report with more details
        try:
            cov.report(show_missing=True, skip_covered=False)
        except coverage.exceptions.NoDataError:
            print("No coverage data collected. This might be because:")
            print("1. No backend/SDK modules were imported during tests")
            print("2. All tested modules are mocked")
            print("3. Tests are not actually calling the backend/SDK code")
            
            # Try to show what modules were loaded
            print("\nLoaded modules that match backend/SDK pattern:")
            for module_name in sys.modules:
                if ('backend' in module_name or 'nexent' in module_name or 'sdk' in module_name) and not 'test' in module_name:
                    print(f"  - {module_name}")
        
        # Generate HTML report
        html_dir = test_dir / 'coverage_html'
        try:
            cov.html_report(directory=str(html_dir))
            print(f"\nHTML coverage report generated in: {html_dir}")
        except coverage.exceptions.NoDataError:
            print(f"\nNo HTML report generated due to lack of coverage data")
        
        # Generate XML report for CI/CD
        xml_file = test_dir / 'coverage.xml'
        try:
            cov.xml_report(outfile=str(xml_file))
            print(f"XML coverage report generated: {xml_file}")
        except coverage.exceptions.NoDataError:
            print(f"No XML report generated due to lack of coverage data")
        
        return result.wasSuccessful()
        
    except Exception as e:
        print(f"Error running tests with coverage: {e}")
        print("Falling back to running tests without coverage...")
        return run_tests_without_coverage()

def run_tests_without_coverage():
    """Run tests without coverage measurement"""
    print("Running tests without coverage measurement...")
    
    # Load and run tests
    suite = load_test_modules()
    
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    return result.wasSuccessful()

def print_test_summary():
    """Print summary of discovered test files"""
    test_files = discover_test_files()
    
    print("Discovered Test Files:")
    print("-" * 40)
    for test_file in test_files:
        rel_path = os.path.relpath(test_file, Path(__file__).parent)
        print(f"  • {rel_path}")
    print(f"\nTotal: {len(test_files)} test files")
    print()

def main():
    """Main function to run all tests"""
    print("Nexent Community - Unit Test Runner")
    print("=" * 60)
    
    # Print test summary
    print_test_summary()
    
    # Run tests with coverage
    success = run_tests_with_coverage()
    
    print("\n" + "=" * 60)
    if success:
        print("✅ All tests passed!")
        sys.exit(0)
    else:
        print("❌ Some tests failed!")
        sys.exit(1)

if __name__ == "__main__":
    main() 