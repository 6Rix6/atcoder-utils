# Paiza.io API Reference (Runners)

This documentation provides details for using the paiza.io code execution engine API.

* **Base URL:** `https://api.paiza.io`
* **Resource Path:** `runners`
* **Version:** 1.0 (Swagger 1.2)

---

## 1. Create Runner Session (`POST /runners/create.json`)

Creates a runner session to build and run the provided source code.

### Parameters

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `api_key` | string | **Yes** | API Key. Always use `guest`. |
| `source_code` | string | **Yes** | The source code to be executed. |
| `language` | string | **Yes** | Programming language. See [Supported Languages](https://www.google.com/search?q=%23supported-languages). |
| `input` | string | No | Data to be passed to the program's standard input (stdin). |

### Response

```json
{
  "id": "session_id", // Used for get_status and get_details APIs
  "status": "running", // 'running' or 'completed'
  "error": "error message" // Present if an error occurred during session creation
}

```

---

## 2. Get Session Status (`GET /runners/get_status.json`)

Checks the current status of a specific session to see if the execution is finished.

### Parameters

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `api_key` | string | **Yes** | API Key. Always use `guest`. |
| `id` | integer | **Yes** | The session ID returned by the `create` API. |

### Response

```json
{
  "id": "session_id",
  "status": "completed", // 'running' or 'completed'
  "error": "error message"
}

```

---

## 3. Get Session Details (`GET /runners/get_details.json`)

Retrieves detailed information about the session, including output (stdout/stderr), exit codes, execution time, and memory usage.

### Parameters

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `api_key` | string | **Yes** | API Key. Always use `guest`. |
| `id` | integer | **Yes** | The session ID returned by the `create` API. |

### Response

```json
{
  "id": "session_id",
  "language": "language",
  "status": "completed", // 'running' or 'completed'
  "build_stdout": "build output to stdout",
  "build_stderr": "build output to stderr",
  "build_exit_code": 0,
  "build_time": 0.5, // seconds
  "build_memory": 1024, // bytes
  "build_result": "success", // 'success', 'failure', or 'error'
  "stdout": "code output to stdout",
  "stderr": "code output to stderr",
  "exit_code": 0,
  "time": 0.1, // seconds
  "memory": 2048, // bytes
  "result": "success" // 'success', 'failure', or 'error'
}

```

---

## Supported Languages

The following values are allowed for the `language` parameter:

`c`, `cpp`, `objective-c`, `java`, `kotlin`, `scala`, `swift`, `csharp`, `go`, `haskell`, `erlang`, `perl`, `python`, `python3`, `ruby`, `php`, `bash`, `r`, `javascript`, `coffeescript`, `vb`, `cobol`, `fsharp`, `d`, `clojure`, `elixir`, `mysql`, `rust`, `scheme`, `commonlisp`, `nadesiko`, `typescript`, `brainfuck`, `plain`
