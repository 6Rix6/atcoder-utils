import React, { useState, useEffect } from "react";
import { AtCoderContest, ProblemLink } from "../../lib/scrapeAtCoder";
import { Button, Loader } from "../components";
import "../styles/activity-tab.css";

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

interface ProblemItemProps {
  problem: ProblemLink;
  onClickProblem?: (problem: ProblemLink) => void;
}

const ProblemItem: React.FC<ProblemItemProps> = ({
  problem,
  onClickProblem,
}) => {
  return (
    <div
      className="problem-item"
      onClick={() => onClickProblem?.(problem)}
      role="button"
      tabIndex={0}
    >
      <span className="problem-id">{problem.name || problem.id}</span>
      {problem.timeLimit && (
        <span className="problem-constraint">{problem.timeLimit}</span>
      )}
      {problem.memoryLimit && (
        <span className="problem-constraint">{problem.memoryLimit}</span>
      )}
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
          <Button onClick={handleOpenContest}>コンテストを開く</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="activity-container">
      {/* ヘッダー部分 */}
      <div className="contest-header">
        <h1 className="contest-title">{contest.title}</h1>
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
