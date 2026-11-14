# physics-rope

Verlet積分（ベルレ積分）を用いた物理ベースのロープシミュレーション。純粋なJavaScriptを使用してHTML Canvasにレンダリングされます。

このプロジェクトは、[James](https://codepen.io/guerrillacontra)氏による[Physics Rope](https://codepen.io/guerrillacontra/pen/XPZeww)のフォークです。

## デモ

両方のデモでマウスを動かすと、ロープのアンカーポイントとインタラクションできます。

-   [**単一ロープデモ**](https://code4fukui.github.io/physics-rope/)
-   [**複数ロープデモ**](https://code4fukui.github.io/physics-rope/multi.html)

## 特徴

-   **リアルな物理演算**: Verlet積分を実装し、安定して説得力のあるロープの動きを実現します。
-   **インタラクティブ**: 各ロープの最初のアンカーポイントがマウスカーソルに追従します。
-   **設定可能**: 重力、質量、減衰（ダンピング）、セグメントの解像度などのパラメータを簡単に調整できます。
-   **純粋なJavaScript**: 外部ライブラリや依存関係はありません。
-   **複数ロープのサポート**: `multi.html`のデモでは、異なる物理特性（減衰など）を持つ2つのロープが同じ操作で相互作用する様子を紹介しています。

## はじめに

1.  リポジトリをクローンします:
    ```bash
    git clone https://github.com/code4fukui/physics-rope.git
    ```
2.  ディレクトリに移動します:
    ```bash
    cd physics-rope
    ```
3.  ES6モジュールをサポートするモダンなWebブラウザで`index.html`または`multi.html`を開きます。

## プログラムでの利用

コアロジックはモジュール化されており、任意のプロジェクトに統合できます。以下は、`index.html`を基にした、ロープを作成してレンダリングする基本的な例です。

```javascript
import { App } from "./App.js";
import { Rope } from "./Rope.js";

// キャンバスとコンテキストを取得
const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");

// ロープのプロパティを定義
const args = {
  start: { x: 100, y: canvas.height / 2 },
  end: { x: canvas.width - 100, y: canvas.height / 2 },
  resolution: 8, // ロープ上の点の間隔
  mass: 0.88,
  damping: 0.95,
  gravity: { x: 0, y: 3000 },
  solverIterations: 500, // 値が大きいほど剛性と安定性が向上します
};

// 1. ロープの点を生成
const points = Rope.generate(
  args.start,
  args.end,
  args.resolution,
  args.mass,
  args.damping
);

// 2. 新しいRopeインスタンスを作成
const rope = new Rope(points, args.solverIterations);

// 3. 各アニメーションフレームでロープの物理演算を更新
const tick = dt => {
  rope.update(args.gravity, dt);
};

// 4. キャンバスにロープを描画
const draw = (canvas, context, dt) => {
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.beginPath();
  context.lineWidth = 4;
  context.strokeStyle = "white";
  
  const p = points[0];
  context.moveTo(p.pos.x, p.pos.y);
  for (let i = 1; i < points.length; i++) {
    context.lineTo(points[i].pos.x, points[i].pos.y);
  }
  context.stroke();
};

// 5. アプリケーションループを開始
const app = new App(window, canvas, context, tick, draw, 60);
app.start();

// (オプション) マウスのインタラクションを追加
app.onMouseMoveHandler = (x, y) => {
  const firstPoint = rope.getPoint(0);
  firstPoint.pos.x = x;
  firstPoint.pos.y = y;
};
```

## 動作原理

シミュレーションは、距離制約によって接続された一連の点（`RopePoint`）で構成されています。

1.  **積分 (Integration)**: 各フレームにおいて、各点の位置は、以前の位置、速度、および重力などの外力に基づいて更新されます。これは、`RopePoint.integrate`内の高精度なStörmer-Verlet（ストーマー・ベルレ）積分のバリアントによって処理されます。
2.  **制約の解決 (Constraint Solving)**: 点が移動した後、それらの制約が適用されます。シミュレーションは複数回（`solverIterations`）反復して隣接する点間の距離を補正し、ロープのセグメントが伸びないようにします。これは`RopePoint.constrain`で処理されます。

## コアファイル

-   `Rope.js`: シミュレーションロジックを管理する主要な`Rope`および`RopePoint`クラスが含まれています。
-   `Vector2.js`: 2Dベクトル演算のためのシンプルなユーティリティクラスです。
-   `App.js`: キャンバス、コンテキスト、および`requestAnimationFrame`ループを管理するための軽量ラッパーです。
-   `index.html` / `multi.html`: ライブラリの使用方法を示すスタンドアロンの例です。

## ライセンス

[MIT](LICENSE)
