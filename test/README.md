# Unit Test Runner

A script to run all unit tests and generate coverage reports.

## Usage

```bash
cd test
python run_all_tests.py
```

## Features

- 🔍 **Auto-discover test files** - Automatically finds all `test_*.py` files
- 📊 **Coverage reports** - Generates console, HTML, and XML format coverage reports
- 🔧 **Auto-install dependencies** - Automatically installs `coverage` package if needed
- ✅ **Detailed output** - Shows the running status and results of each test

## Output Files

- `coverage_html/` - Detailed HTML format coverage report
- `coverage.xml` - XML format coverage report (for CI/CD)
- `.coverage` - Coverage data file

## Sample Output

```
Nexent Community - Unit Test Runner
============================================================
Discovered Test Files:
----------------------------------------
  • backend/services/test_agent_service.py
  • backend/services/test_conversation_management_service.py
  • backend/services/test_knowledge_summary_service.py

Total: 3 test files

============================================================
Running Unit Tests with Coverage
============================================================

test_get_enable_tool_id_by_agent_id ... ok
test_save_message_with_string_content ... ok
test_load_knowledge_prompts ... ok
...

============================================================
Coverage Report
============================================================
Name                                               Stmts   Miss  Cover   Missing
--------------------------------------------------------------------------------
backend/services/agent_service.py                   120     15    88%   45-50, 78-82
backend/services/conversation_management_service.py  180     25    86%   123-128, 156-162
backend/services/knowledge_summary_service.py        45      8    82%   35-42
--------------------------------------------------------------------------------
TOTAL                                               345     48    86%

HTML coverage report generated in: test/coverage_html
XML coverage report generated: test/coverage.xml

============================================================
✅ All tests passed! 