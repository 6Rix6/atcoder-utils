# ローカル実行ガイド

ローカルモードでは、PC にインストールされたコンパイラ/インタプリタを使ってコードを実行します。

> [!NOTE]
> ローカルモードではメモリ使用量の計測は行われません。
> 実行時間は計測されますが、不正確な場合があるのであくまで目安としてください。

## 設定方法

VS Code の設定メニューから 拡張機能 > AtCoder Utils > **Execution Mode** を `local` に変更してください。

## エラー

ローカル環境での実行時(特にコンパイルが必要な言語での実行時)に、

```
Error: spawn ETXTBSY
spawn /path/to/executable EACCES
```

などのエラーが発生する場合は、`atcoder-utils.compileDelayMs`を長めに設定してみてください。

## 対応言語一覧

| 言語 ID      | 言語名     | コンパイル                                          | 実行                     |
| ------------ | ---------- | --------------------------------------------------- | ------------------------ |
| `python3`    | Python 3   | —                                                   | `python {source}`        |
| `python`     | Python 2   | —                                                   | `python {source}`        |
| `javascript` | JavaScript | —                                                   | `node {source}`          |
| `typescript` | TypeScript | —                                                   | `npx ts-node {source}`   |
| `c`          | C          | `gcc {source} -o {output}`                          | `{output}`               |
| `cpp`        | C++        | `g++ {source} -o {output}`                          | `{output}`               |
| `java`       | Java       | `javac {source}`                                    | `java -cp {dir} Main`    |
| `go`         | Go         | —                                                   | `go run {source}`        |
| `rust`       | Rust       | `rustc {source} -o {output}`                        | `{output}`               |
| `ruby`       | Ruby       | —                                                   | `ruby {source}`          |
| `kotlin`     | Kotlin     | `kotlinc {source} -include-runtime -d {output}.jar` | `java -jar {output}.jar` |
| `swift`      | Swift      | —                                                   | `swift {source}`         |
| `php`        | PHP        | —                                                   | `php {source}`           |
| `perl`       | Perl       | —                                                   | `perl {source}`          |
| `bash`       | Bash       | —                                                   | `bash {source}`          |
| `r`          | R          | —                                                   | `Rscript {source}`       |

> [!NOTE]
> 上記以外の言語はローカル実行に対応していません。Paiza モードを使用するか、カスタムコマンドを設定してください。

## カスタムコマンドの設定

`settings.json` の `atcoder-utils.localCustomCommands` で、言語ごとにコンパイル・実行コマンドをカスタマイズできます。

### 使用可能なプレースホルダー

| プレースホルダー | 説明                         |
| ---------------- | ---------------------------- |
| `{source}`       | 一時ソースファイルのパス     |
| `{output}`       | コンパイル出力ファイルのパス |
| `{workspace}`    | ワークスペースフォルダのパス |
| `{fileDir}`      | 対象ファイルのディレクトリ   |
| `{file}`         | 対象ファイルのフルパス       |

### 設定例

#### C++ で `make` を使う

```json
"atcoder-utils.localCustomCommands": {
  "cpp": {
    "compile": "make -C {workspace}",
    "run": "{workspace}/a.out"
  }
}
```

#### C++ で最適化オプションを追加

```json
"atcoder-utils.localCustomCommands": {
  "cpp": {
    "compile": "g++ -O2 -std=c++17 {source} -o {output}",
    "run": "{output}"
  }
}
```

#### Python で特定のバージョンを指定

```json
"atcoder-utils.localCustomCommands": {
  "python3": {
    "run": "python3.11 {source}"
  }
}
```

> [!TIP]
> `compile` と `run` は両方ともオプションです。指定しなかった項目はデフォルトのコマンドが使われます。
>
> カスタムコマンドはデフォルトのコマンドより優先されます。
