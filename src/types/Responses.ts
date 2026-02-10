export interface CreateResponse {
  id: string;
  status: "running" | "completed";
  error?: string;
}

export interface StatusResponse {
  id: string;
  status: "running" | "completed";
  error?: string;
}

export interface DetailsResponse {
  id: string;
  language: string;
  status: "running" | "completed";
  build_stdout: string;
  build_stderr: string;
  build_exit_code: number;
  build_time: number;
  build_memory: number;
  build_result: "success" | "failure" | "error";
  stdout: string;
  stderr: string;
  exit_code: number;
  time: number;
  memory: number;
  result: "success" | "failure" | "error";
}
