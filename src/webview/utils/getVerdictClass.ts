import { Verdict } from "../../types/TestCaseResult";

export const getVerdictClass = (verdict: Verdict | null) => {
  switch (verdict) {
    case "AC":
      return "verdict-ac";
    case "WA":
      return "verdict-wa";
    case "RE":
      return "verdict-re";
    case "CE":
      return "verdict-ce";
    case "TLE":
      return "verdict-tle";
    default:
      return "";
  }
};
