import React, { useState, useEffect } from "react";
import { AtCoderContest, ProblemLink } from "../../lib/scrapeAtCoder";
import { Button, Loader } from "../components";
import "../styles/activity-tab.css";
import { BoxArrowUpRight } from "../components/icons";

const vscode = (window as any).acquireVsCodeApi();

const formatDate = (date: Date): string => {
  return new Date(date).toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) {
    return `${hours}時間${mins}分`;
  } else if (hours > 0) {
    return `${hours}時間`;
  } else {
    return `${mins}分`;
  }
};

const formatRemainingTime = (milliseconds: number): string => {
  if (milliseconds <= 0) return "00:00:00";

  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

type ContestStatus = "before" | "ongoing" | "ended" | "practice";

interface ContestTimerProps {
  beginAt: Date;
  endAt: Date;
  durationMinutes: number;
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
    if (nowTime < practiceEndTime) {
      status = "practice";
      remainingMs = practiceEndTime - nowTime;
      label = "残り時間";
    } else {
      // Practice timer ended
      status = "ended";
      remainingMs = 0;
      label = "";
      setPracticeStartTime(null);
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
    remainingMs = 0;
    label = "";
  }

  const handleStartPractice = () => {
    setPracticeStartTime(Date.now());
  };

  const handleStopPractice = () => {
    setPracticeStartTime(null);
  };

  if (status === "ended") {
    return (
      <div className="contest-timer contest-timer-ended">
        <button className="timer-start-button" onClick={handleStartPractice}>
          タイマー開始
        </button>
      </div>
    );
  }

  if (status === "practice") {
    return (
      <div className="contest-timer contest-timer-practice">
        <span className="timer-label">{label}</span>
        <span className="timer-value">{formatRemainingTime(remainingMs)}</span>
        <button className="timer-stop-button" onClick={handleStopPractice}>
          停止
        </button>
      </div>
    );
  }

  return (
    <div className={`contest-timer contest-timer-${status}`}>
      <span className="timer-label">{label}</span>
      <span className="timer-value">{formatRemainingTime(remainingMs)}</span>
    </div>
  );
};

interface ProblemItemProps {
  problem: ProblemLink;
  onClickProblem?: (problem: ProblemLink) => void;
}

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

  // const handleOpenInBrowser = () => {
  // };

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
      {/* ヘッダー部分 */}
      <div className="contest-header">
        <h1 className="contest-title">{contest.title}</h1>
        <ContestTimer
          beginAt={contest.beginAt}
          endAt={contest.endAt}
          durationMinutes={contest.durationMinutes}
        />
      </div>

      {/* コンテスト情報 */}
      <div className="contest-info">
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

      {/* 問題リスト */}
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
