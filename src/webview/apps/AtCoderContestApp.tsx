import React, { useState, useEffect } from "react";
import { AtCoderContest, ProblemLink } from "../../lib/scrapeAtCoder";
import { Button, Loader } from "../components";
import "../styles/activity-tab.css";
import "../styles/scrollbar.css";
import {
  BoxArrowUpRight,
  Play,
  Pause,
  ArrowClockwise,
} from "../components/icons";
import { getVscode } from "../utils/getVscode";
import {
  formatDate,
  formatDuration,
  formatRemainingTime,
} from "../utils/formatUtils";

const vscode = getVscode();

type ContestStatus = "before" | "ongoing" | "ended" | "practice";

interface ContestTimerProps {
  beginAt: Date;
  endAt: Date;
  durationMinutes: number;
}

interface ProblemItemProps {
  problem: ProblemLink;
  onClickProblem?: (problem: ProblemLink) => void;
}

const ContestTimer: React.FC<ContestTimerProps> = ({
  beginAt,
  endAt,
  durationMinutes,
}) => {
  const [now, setNow] = useState(new Date());
  const [practiceStartTime, setPracticeStartTime] = useState<number | null>(
    null,
  );
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [pausedAt, setPausedAt] = useState<number | null>(null);

  // Reset timer when contest changes
  useEffect(() => {
    setPracticeStartTime(null);
    setPausedAt(null);
    setIsTimerRunning(false);
  }, [beginAt]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const beginTime = new Date(beginAt).getTime();
  const endTime = new Date(endAt).getTime();
  const nowTime = now.getTime();
  const practiceDurationMs = durationMinutes * 60 * 1000;

  let status: ContestStatus;
  let remainingMs: number;
  let label: string;

  if (practiceStartTime !== null) {
    const practiceEndTime = practiceStartTime + practiceDurationMs;
    const effectiveNowTime = pausedAt !== null ? pausedAt : nowTime;
    if (effectiveNowTime < practiceEndTime) {
      status = "practice";
      remainingMs = practiceEndTime - effectiveNowTime;
      label = "残り時間";
    } else {
      status = "ended";
      remainingMs = practiceDurationMs;
      label = "残り時間";
      setPracticeStartTime(null);
      setPausedAt(null);
    }
  } else if (nowTime < beginTime) {
    status = "before";
    remainingMs = beginTime - nowTime;
    label = "開始まで";
  } else if (nowTime < endTime) {
    status = "ongoing";
    remainingMs = endTime - nowTime;
    label = "残り時間";
  } else {
    status = "ended";
    remainingMs = practiceDurationMs;
    label = "残り時間";
  }

  const handleStartPractice = () => {
    const currentTime = Date.now();
    if (practiceStartTime === null) {
      setPracticeStartTime(currentTime);
    } else if (pausedAt !== null) {
      const pauseDuration = currentTime - pausedAt;
      setPracticeStartTime(practiceStartTime + pauseDuration);
    }
    setPausedAt(null);
    setNow(new Date());
    setIsTimerRunning(true);
  };

  const handlePausePractice = () => {
    setPausedAt(Date.now());
    setIsTimerRunning(false);
  };

  const handleResetPractice = () => {
    setPracticeStartTime(null);
    setPausedAt(null);
    setIsTimerRunning(false);
  };

  return (
    <div className={`contest-timer contest-timer-${status}`}>
      <div className="timer-value-container">
        <span className="timer-label">{label}</span>
        <span className="timer-value">{formatRemainingTime(remainingMs)}</span>
      </div>
      {status === "ended" || status === "practice" ? (
        <div className="timer-buttons-container">
          <button
            className="timer-button timer-reset-button"
            onClick={handleResetPractice}
          >
            <ArrowClockwise />
          </button>
          {isTimerRunning ? (
            <button
              className="timer-button timer-pause-button"
              onClick={handlePausePractice}
            >
              <Pause />
            </button>
          ) : (
            <button
              className="timer-button timer-start-button"
              onClick={handleStartPractice}
            >
              <Play />
            </button>
          )}
        </div>
      ) : (
        <></>
      )}
    </div>
  );
};

const ProblemItem: React.FC<ProblemItemProps> = ({
  problem,
  onClickProblem,
}) => {
  const handleOpenInBrowser = () => {
    vscode.postMessage({
      command: "openInBrowser",
      url: problem.url,
    });
  };

  return (
    <div className="problem-item-container">
      <div
        className="problem-item problem-item-name"
        onClick={() => onClickProblem?.(problem)}
        role="button"
      >
        <span className="problem-id">{problem.name || problem.id}</span>
      </div>
      <div
        className="problem-item problem-item-actions"
        onClick={handleOpenInBrowser}
        role="button"
      >
        <BoxArrowUpRight />
      </div>
    </div>
  );
};

const AtCoderContestApp = () => {
  const [contest, setContest] = useState<AtCoderContest | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      switch (message.command) {
        case "setContest":
          setContest(message.contest);
          break;
      }
    };
    window.addEventListener("message", handleMessage);

    getContest();
    setIsLoading(false);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  const getContest = () => {
    vscode.postMessage({
      command: "getContest",
    });
  };

  const handleOpenContest = () => {
    vscode.postMessage({
      command: "openContest",
    });
  };

  const handleClickProblem = (problem: ProblemLink) => {
    vscode.postMessage({
      command: "openProblem",
      problem,
    });
  };

  if (isLoading) {
    return <Loader />;
  }

  if (!contest) {
    return (
      <div className="activity-container">
        <div className="empty-state">
          <p className="empty-state-text">コンテストが選択されていません</p>
          <Button className="empty-state-button" onClick={handleOpenContest}>
            <span>コンテストを開く</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="activity-container">
      {/* Header */}
      <div className="contest-header">
        <h1 className="contest-title">{contest.title}</h1>
      </div>

      {/* Contest info */}
      <div className="contest-info">
        <div className="contest-info-row">
          <span className="contest-info-label">コンテストID</span>
          <span className="contest-info-value">{contest.id}</span>
        </div>
        <div className="contest-info-row">
          <span className="contest-info-label">開始</span>
          <span className="contest-info-value">
            {formatDate(contest.beginAt)}
          </span>
        </div>
        <div className="contest-info-row">
          <span className="contest-info-label">終了</span>
          <span className="contest-info-value">
            {formatDate(contest.endAt)}
          </span>
        </div>
        <div className="contest-info-row">
          <span className="contest-info-label">制限時間</span>
          <span className="contest-info-value">
            {formatDuration(contest.durationMinutes)}
          </span>
        </div>
      </div>

      {/* Timer */}
      <div className="contest-info">
        <ContestTimer
          beginAt={contest.beginAt}
          endAt={contest.endAt}
          durationMinutes={contest.durationMinutes}
        />
      </div>

      {/* Problems list */}
      <div className="problems-section">
        <h2 className="section-title">問題一覧</h2>
        {contest.problems.length > 0 ? (
          <div className="problems-list">
            {contest.problems.map((problem) => (
              <ProblemItem
                key={problem.id}
                problem={problem}
                onClickProblem={handleClickProblem}
              />
            ))}
          </div>
        ) : (
          <p className="empty-problems-text">問題情報がありません</p>
        )}
      </div>
    </div>
  );
};

export default AtCoderContestApp;
