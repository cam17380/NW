# ネットワークシミュレータ 仕様説明書

**バージョン:** 1.1
**最終更新日:** 2026-04-01

---

## 1. 概要

本アプリケーションは、Webブラウザ上で動作するCisco IOSスタイルのネットワークシミュレータです。ドラッグ＆ドロップによるネットワークトポロジの設計、CLIコマンドによるデバイス設定、パケットフローのリアルタイム可視化を提供します。

### 1.1 目的

- ネットワーク構成の学習・演習環境の提供
- Cisco IOSコマンド体系の習得支援
- ルーティング・NAT・ファイアウォール・VLANの動作理解

### 1.2 動作環境

| 項目 | 要件 |
|------|------|
| ブラウザ | ES Modules対応のモダンブラウザ（Chrome, Firefox, Edge等） |
| サーバー | 不要（ローカルファイルまたは静的Webサーバーで動作） |
| 依存ライブラリ | なし（純粋なHTML/CSS/JavaScript） |

---

## 2. システムアーキテクチャ

### 2.1 ファイル構成

```
NW/
├── index.html              # エントリーポイント（HTML）
├── styles/
│   └── main.css            # スタイルシート（ダークテーマ）
├── src/
│   ├── main.js             # アプリケーション初期化
│   ├── core/
│   │   ├── Store.js        # 集中状態管理
│   │   └── EventBus.js     # Pub/Subイベントシステム
│   ├── model/
│   │   └── Topology.js     # デバイス・リンクのデータモデルとファクトリ
│   ├── cli/
│   │   ├── CLIEngine.js    # コマンドパーサー・モードディスパッチャ
│   │   ├── CommandRegistry.js # コマンドツリー・ヒントデータ構造
│   │   ├── TabComplete.js  # タブ補完エンジン
│   │   ├── Abbreviations.js # コマンド略語展開
│   │   └── commands/       # コマンド実装（Show, Config, Interface等）
│   ├── simulation/
│   │   ├── PingEngine.js   # Ping/Traceroute/ARP解決エンジン
│   │   ├── Routing.js      # ルーティング・NAT・ファイアウォール・L2到達性ロジック
│   │   └── NetworkUtils.js # IPアドレスユーティリティ
│   ├── rendering/
│   │   ├── CanvasRenderer.js # キャンバス描画・アニメーションオーケストレータ
│   │   ├── DeviceRenderer.js # デバイスアイコン描画
│   │   └── LinkRenderer.js # リンク描画・エッジポイント計算
│   ├── ui/
│   │   ├── Terminal.js     # ターミナル表示
│   │   ├── DeviceTabs.js   # デバイスタブ切替
│   │   ├── CommandHints.js # コマンドヒント表示
│   │   ├── VlanLegend.js   # VLAN凡例表示
│   │   └── Toast.js        # 通知トースト
│   ├── design/
│   │   ├── DesignController.js # デザインモードのキャンバス操作
│   │   ├── DevicePalette.js # デバイスパレット
│   │   ├── InterfacePicker.js # インターフェース選択ダイアログ
│   │   └── ContextMenu.js  # 右クリックメニュー
│   └── persistence/
│       ├── LocalStorage.js # ブラウザストレージ永続化
│       ├── Snapshot.js     # シリアライゼーション
│       ├── Templates.js    # ネットワーク構成テンプレートデータ
│       ├── ConfigExport.js # CLIコマンドスクリプト生成
│       ├── Splitter.js     # パネルスプリッター
│       └── TemplateSelector.js # テンプレート選択UI
```

### 2.2 アーキテクチャパターン

- **イベント駆動設計:** EventBusによるPub/Sub方式でコンポーネント間を疎結合に連携
- **集中状態管理:** Storeがデバイス、リンク、CLIモード、コマンド履歴等の全状態を管理
- **モジュラー構成:** ES Modulesによるファイル分割で機能ごとに独立

---

## 3. デバイス仕様

### 3.1 対応デバイスタイプ

| デバイス | 略称 | インターフェース | 主な機能 |
|----------|------|-----------------|----------|
| **ルーター** | R1, R2, ... | GigabitEthernet0/0〜0/3 | スタティックルーティング、NAT、標準/拡張ACL |
| **スイッチ** | SW1, SW2, ... | FastEthernet0/1〜0/24 | VLAN、アクセス/トランクポート |
| **ファイアウォール** | FW1, FW2, ... | GigabitEthernet0/0〜0/3 | ファイアウォールポリシー、NAT、標準/拡張ACL |
| **サーバー** | SV1, SV2, ... | Ethernet0〜（複数） | 複数インターフェース、スタティックルーティング、デフォルトゲートウェイ |
| **PC** | PC1, PC2, ... | Ethernet0 | 単一インターフェース、デフォルトゲートウェイ |

### 3.2 デバイスデータモデル

```
Device {
  type: 'router' | 'switch' | 'pc' | 'firewall' | 'server'
  hostname: string
  x, y: number（キャンバス上の座標）

  interfaces: {
    [name]: {
      ip: string | null
      mask: string | null
      status: 'up' | 'down'
      protocol: 'up' | 'down'
      description: string
      connected: { device, iface } | null
      natRole: 'inside' | 'outside' | null
      accessGroup: { in: number | null, out: number | null }  // R/FWのみ
      switchport: { mode, accessVlan, trunkAllowed }  // スイッチのみ
    }
  }

  routes: [{ network, mask, nextHop }]              // ルーター/FW/サーバー
  nat: { staticEntries, pools, dynamicRules, translations, stats }
  accessLists: {
    [1-99]:   [{ action, network, wildcard }]                                            // 標準ACL
    [100-199]: [{ action, protocol, src, srcWildcard, dst, dstWildcard, port }]          // 拡張ACL
  }
  policies: [{ seq, action, src, srcWildcard, dst, dstWildcard, protocol, port }]  // FWのみ
  vlans: { [id]: { name } }                         // スイッチのみ
  defaultGateway: string | null                      // PC/サーバーのみ
}
```

### 3.3 リンクデータモデル

```
Link {
  from: deviceId        # 接続元デバイス
  fromIf: string        # 接続元インターフェース名
  to: deviceId          # 接続先デバイス
  toIf: string          # 接続先インターフェース名
}
```

---

## 4. CLIコマンド仕様

### 4.1 CLIモード遷移

```
ユーザーEXEC  ──enable──>  特権EXEC  ──configure terminal──>  グローバルコンフィグ
                                                                    │
                                                    interface <name>│
                                                                    v
                                                            インターフェースコンフィグ

グローバルコンフィグ  ──vlan <id>──>  VLANコンフィグ（スイッチのみ）

※ exit: 1つ上のモードに戻る / end: 特権EXECに戻る
```

### 4.2 コマンド一覧

#### 4.2.1 モード切替コマンド

| コマンド | 略語 | 動作 |
|----------|------|------|
| `enable` | `en` | 特権EXECモードへ遷移 |
| `configure terminal` | `conf t` | グローバルコンフィグモードへ遷移 |
| `interface <name>` | `int <name>` | インターフェースコンフィグモードへ遷移 |
| `vlan <id>` | - | VLANコンフィグモードへ遷移（スイッチのみ） |
| `exit` | - | 1つ上のモードへ戻る |
| `end` | - | 特権EXECモードへ戻る |

#### 4.2.2 インターフェース設定コマンド

| コマンド | 動作 | 対象デバイス |
|----------|------|-------------|
| `ip address <ip> <mask>` | IPアドレスとサブネットマスクを設定 | R, FW, PC |
| `no shutdown` | インターフェースを有効化 | 全デバイス |
| `shutdown` | インターフェースを無効化 | 全デバイス |
| `description <text>` | インターフェースの説明文を設定 | 全デバイス |
| `ip nat inside` | NAT内部インターフェースに指定 | R, FW |
| `ip nat outside` | NAT外部インターフェースに指定 | R, FW |
| `ip access-group <acl-num> in\|out` | ACLをインターフェースに適用 | R, FW |
| `no ip access-group <acl-num> in\|out` | インターフェースからACLを解除 | R, FW |
| `switchport mode access` | アクセスポートに設定 | SW |
| `switchport mode trunk` | トランクポートに設定 | SW |
| `switchport access vlan <id>` | アクセスVLANを割り当て | SW |
| `switchport trunk allowed vlan <list>` | トランクの許可VLANを設定 | SW |

#### 4.2.3 ルーティングコマンド

| コマンド | 動作 | 対象デバイス |
|----------|------|-------------|
| `ip route <network> <mask> <next-hop>` | スタティックルートを追加 | R, FW, SV |
| `no ip route <network> <mask> <next-hop>` | スタティックルートを削除 | R, FW, SV |
| `ip default-gateway <ip>` | デフォルトゲートウェイを設定 | PC, SV |

#### 4.2.4 NATコマンド

| コマンド | 動作 |
|----------|------|
| `ip nat inside source static <local-ip> <global-ip>` | スタティックNATエントリを追加 |
| `ip nat pool <name> <start-ip> <end-ip> netmask <mask>` | NATプールを定義 |
| `ip nat inside source list <acl-num> pool <name>` | ダイナミックNATルールを設定（標準ACL使用） |

#### 4.2.5 ACLコマンド（R/FW）

##### 標準ACL（番号1〜99）

送信元IPアドレスのみでフィルタリングを行います。主にNATの条件定義にも使用されます。

| コマンド | 動作 |
|----------|------|
| `access-list <1-99> permit\|deny <network> [wildcard]` | 標準ACLエントリを追加 |
| `no access-list <num>` | ACL全体を削除 |

##### 拡張ACL（番号100〜199）

送信元IP、宛先IP、プロトコル、ポート番号でフィルタリングを行います。

| コマンド | 動作 |
|----------|------|
| `access-list <100-199> permit\|deny <proto> <src> <srcWC> <dst> <dstWC> [eq <port>]` | 拡張ACLエントリを追加 |
| `no access-list <num>` | ACL全体を削除 |

- `proto`: `ip`, `tcp`, `udp`, `icmp`
- `src`/`dst`: IPアドレス＋ワイルドカードマスク、`any`（全アドレス）、または `host <ip>`（単一ホスト）
- `eq <port>`: TCP/UDPのポート番号を指定（オプション、1〜65535）
- ACL末尾に暗黙の **deny all** が存在

##### 標準ACLと拡張ACLの比較

| 項目 | 標準ACL（1-99） | 拡張ACL（100-199） |
|------|----------------|-------------------|
| 送信元IP | マッチ | マッチ |
| 宛先IP | - | マッチ |
| プロトコル | - | ip/tcp/udp/icmp |
| ポート番号 | - | eq指定可能（tcp/udp） |
| 主な用途 | NATの条件定義、基本フィルタ | トラフィックの詳細フィルタリング |

##### インターフェースへのACL適用

ACLはインターフェースの受信方向（in）または送信方向（out）に適用します。

```
interface GigabitEthernet0/0
  ip access-group <acl-num> in       # 受信パケットにACLを適用
  ip access-group <acl-num> out      # 送信パケットにACLを適用
```

#### 4.2.6 ファイアウォールコマンド（FWのみ）

| コマンド | 動作 |
|----------|------|
| `firewall policy <seq> permit\|deny <src> <srcWC> <dst> <dstWC> <proto> [port]` | ファイアウォールポリシーを追加 |
| `no firewall policy <seq>\|all` | ポリシーを削除 |

- `src`/`dst`: IPアドレス＋ワイルドカードマスク、または `any`
- `proto`: `ip`, `tcp`, `udp`, `icmp`
- 暗黙の"deny all"がポリシー末尾に存在

#### 4.2.7 VLANコマンド（スイッチのみ）

| コマンド | 動作 |
|----------|------|
| `vlan <id>` | VLANを作成しVLANコンフィグに遷移 |
| `name <vlan-name>` | VLAN名を設定 |
| `no vlan <id>` | VLANを削除 |

#### 4.2.8 Showコマンド

| コマンド | 表示内容 |
|----------|---------|
| `show ip interface brief` | インターフェース概要（IP、状態） |
| `show running-config` | デバイスの現在の設定全体 |
| `show interfaces` | インターフェース詳細情報 |
| `show ip route` | ルーティングテーブル |
| `show ip nat translations` | NAT変換テーブル |
| `show ip nat statistics` | NAT統計情報 |
| `show firewall policy` | ファイアウォールポリシー一覧 |
| `show access-lists` | ACL一覧（エントリと適用先インターフェース） |
| `show arp` | ARPテーブル |
| `show packet-flow <ip>` | パケットフローの詳細診断（ACLチェック含む） |
| `show vlan brief` | VLAN概要（スイッチのみ） |
| `show interfaces trunk` | トランクポート情報（スイッチのみ） |
| `show interfaces switchport` | スイッチポート設定（スイッチのみ） |

#### 4.2.9 診断コマンド

| コマンド | 動作 |
|----------|------|
| `ping <ip>` | 指定IPへの疎通確認（アニメーション付き） |
| `traceroute <ip>` | 指定IPまでの経路追跡（ホップごと表示） |
| `clear arp` | ARPキャッシュをクリア |

---

## 5. シミュレーションエンジン仕様

### 5.1 ルーティングアルゴリズム

1. **直接接続ネットワーク**: 宛先IPがインターフェースと同一サブネットにあるか確認
2. **ロンゲストプレフィックスマッチ**: スタティックルートの中でCIDRが最も長い（最も具体的な）ルートを選択
3. **PCの場合**: 直接接続を先にチェックし、なければデフォルトゲートウェイを使用

### 5.2 L2スイッチング

- **VLAN対応BFS（幅優先探索）**: スイッチファブリック全体でVLAN境界を厳密に分離
- **VLAN制約**: アクセスポートのVLANタグとトランクポートの許可VLANリストを考慮
- VLANが経路上で一致しない場合、到達不能と判定
- **全BFS関数がVLAN対応**: `isReachableViaSwitch`、`bfsSwitchPath`、`getL2BroadcastDomain`、`canReachL2` のすべてでVLANパラメータを使用
- **portCarriesVlan()**: スイッチポートが指定VLANを搬送するかをaccess/trunkモード別に判定
- **canReachL2()**: スイッチ経由でL3デバイスに到達した際、接続されたインターフェースのIPのみをチェック（デバイスの全インターフェースではない）

### 5.3 NAT処理

| 方向 | 処理順序 |
|------|---------|
| **Outside → Inside** | 変換テーブルを検索し、グローバルIPをローカルIPに逆変換 |
| **Inside → Outside** | (1) スタティックNATを確認 → (2) ダイナミックNAT（ACL＋プール割当） |

- **プール割当**: 利用可能なIPからラウンドロビンで割当
- **統計情報**: ヒット数・ミス数を追跡

### 5.4 ACLフィルタリング

ACLはインターフェース単位で `in`（受信）/`out`（送信）方向に適用されます。

**評価順序:**
1. エントリを定義順（上から下）に評価
2. 最初にマッチしたエントリの `permit`/`deny` を適用
3. どのエントリにもマッチしない場合、暗黙の **deny all**

**マッチングロジック:**
- **標準ACL**: 送信元IPのみをワイルドカードマスクで比較
- **拡張ACL**: 送信元IP、宛先IP、プロトコル（ip/tcp/udp/icmp）を比較。ポート番号は `eq` 指定時のみ

**パケット処理におけるACLチェックの順序:**
1. パケットがインターフェースに到着 → **inbound ACL** チェック
2. NAT変換を適用
3. ファイアウォールポリシーチェック（FWのみ）
4. ルーティング検索
5. 出力インターフェースを決定 → **outbound ACL** チェック
6. パケット転送

### 5.5 ファイアウォールフィルタリング

1. シーケンス番号の昇順で評価
2. ワイルドカードマスクによるIPマッチング: `(IP & ~wildcard) === (network & ~wildcard)`
3. 最初にマッチしたルールの`permit`/`deny`を適用
4. どのルールにもマッチしない場合、暗黙の**deny all**

### 5.6 ARP解決

#### 5.6.1 ARPテーブル

各L3デバイス（ルーター、ファイアウォール、サーバー、PC）はARPテーブルを保持します。

```
arpTable: [{ ip: string, mac: string, iface: string }]
```

- **MACアドレス生成**: `generateMAC(deviceId, ifName)` でデバイスIDとインターフェース名から決定論的に生成
- **学習タイミング**: ping/traceroute実行時に経路上の隣接L3デバイス間で学習
- **サブネット判定**: 送信元のサブネットマスクでピアIPが同一サブネットかを判定（送信元の/16マスクに対応）
- **VLAN対応**: 同一VLAN内で到達可能なインターフェースのみARP学習対象

#### 5.6.2 ARP解決の可視化

ping実行時、ARPテーブルにエントリがないL3ホップでは、ICMPアニメーションの**前に**ARP解決アニメーションを表示します。

| フェーズ | 説明 | ビジュアル |
|---------|------|-----------|
| **ARP Request** | 送信元 → スイッチ → L2ブロードキャストドメイン全体にフラッド | 金色ダイヤモンド型パーティクル、`ARP: Who has X.X.X.X?` ラベル |
| **ブロードキャスト結果** | ターゲットデバイスにヒット表示、非ターゲットにミス表示 | 緑チェックマーク / 赤×マーク |
| **ARP Reply** | ターゲット → スイッチ → 送信元へユニキャスト応答 | オレンジダイヤモンド型パーティクル、`ARP Reply: X.X.X.X is at MAC` ラベル |

- **2回目以降のpingではスキップ**: ARPテーブルにキャッシュ済みのエントリがあればARP解決は省略
- **ターミナル出力**: ARP Request/Replyのメッセージが金色で表示
- **VLAN分離**: ブロードキャストは同一VLAN内のデバイスにのみフラッド

#### 5.6.3 `clear arp` コマンド

ARPキャッシュをクリアすることで、次回のpingで再びARP解決アニメーションを確認できます。

### 5.7 パケットパス構築

1. 送信元デバイスから宛先まで、ホップごとにルーティングを解決
2. 各ルーター/ファイアウォールの入力インターフェースでinbound ACLチェック
3. 各ルーター/ファイアウォールでNAT変換を適用
4. ファイアウォールでポリシーチェックを実施
5. 出力インターフェースでoutbound ACLチェック
6. スイッチファブリックではVLAN対応のBFSで経路を探索
7. ループ検出（訪問済みセット）で無限ループを防止
8. **linkHints配列**: 各セグメントで使用するインターフェースペア（fromIf, toIf）を記録し、アニメーションやARP解決で正確なリンクを特定

### 5.8 パケットフロー診断

`show packet-flow <ip>` コマンドは各ホップでの判断を詳細に表示:

- 入力インターフェース
- ローカルチェック（宛先がこのデバイスか）
- **ACLチェック（inbound: 入力インターフェースのACL permit/deny）**
- NAT変換（変換前後のIP）
- ファイアウォールチェック（ポリシーの許可/拒否）
- ルーティング検索（選択されたルートとネクストホップ）
- **ACLチェック（outbound: 出力インターフェースのACL permit/deny）**
- 出力インターフェース
- L2スイッチング（VLANを通じた転送）

---

## 6. UI仕様

### 6.1 画面レイアウト

```
┌─── ヘッダー ──────────────────────────────────────────────────────┐
│ タイトル | デバイスタブ | [File ▾] [Templates] [Design Mode] [Reset] │
├──────────────────────────────────────────────────────────────────┤
│                    │     │                │                        │
│   キャンバス       │  パ │  ス  │          │   ターミナル           │
│  （トポロジ図）    │  レ │  プ  │          │                        │
│                    │  ッ │  リ  │          │   出力エリア           │
│   凡例（2行）      │  ト │  ッ  │          │   ヒントパネル         │
│   ? Help           │     │  タ  │          │   入力プロンプト        │
│                    │     │  ー  │          │                        │
└────────────────────┴─────┴──────┴──────────┴────────────────────────┘
```

- **ツールバー**: Fileドロップダウンメニュー（Save/Load/Export JSON/Import JSON/Export Script）、Templates、Design Mode、Resetの4項目
- **スプリッター**: キャンバスとターミナルの境界をドラッグで左右に調整可能（位置はlocalStorageに保存）
- **デザインパレット**: デザインモード時に左端に表示

### 6.2 キャンバス表示

- **デバイスアイコン**: デバイスタイプごとに異なる形状と固有色で描画
- **デバイスタイプ別カラー**: ルーター=緑、スイッチ=オレンジ、ファイアウォール=赤、サーバー=紫、PC=青
- **ステータスの明暗表現**: 明るい=全インターフェースUP、暗い=一部UP、最も暗い=全DOWN
- **リンク**: デバイス間を線で接続、VLANに応じた色分け
- **エッジベースリンク描画**: リンクはデバイスの中心ではなく外周（辺）から描画され、各インターフェースが異なる接続点を持つ
- **並行リンク**: 同一デバイス間の複数リンクをデバイスIDのソート順で統一した法線方向にオフセットし、ラベルは接線方向にずらして表示。リンクのfrom/to方向に関係なく一貫した法線方向を使用
- **凡例（2行）**: 1行目=デバイスタイプ色、2行目=リンク状態・トランク・VLAN情報
- **パケットアニメーション**: Ping/Traceroute時にパケットの移動をリンク線上で正確に視覚化（linkHintsにより正しいリンクを追従）
- **ARP解決アニメーション**: ping時にARP Request（金色ダイヤモンド）のブロードキャストとARP Reply（オレンジ）のユニキャストを可視化

### 6.3 ターミナル

- **カラー出力**: コマンド（シアン）、成功（緑）、エラー（赤）、ARP情報（金色）
- **タブ補完**: Tabキーでコマンド自動補完
- **コマンド履歴**: 上下矢印キーで履歴をナビゲーション
- **コマンドヒント**: 現在の入力に応じた候補をリアルタイム表示

### 6.4 テンプレート選択

Templatesボタンからモーダルを開き、構成済みのネットワークテンプレートを選択して即座にロードできます。

| テンプレート | 構成 | 学習テーマ |
|------------|------|-----------|
| Simple LAN | R1 + SW1 + PC x3 | 基本的なIP設定、ping |
| Multi-Subnet Routing | R x2 + SW x2 + PC x4 | サブネット間ルーティング |
| DMZ with Firewall | FW + R + SW x2 + SV x2 + PC x2 | ファイアウォールポリシー、DMZ |
| VLAN with Inter-VLAN Routing | R1 + SW1(VLAN10/20) + PC x4 | VLAN分離、VLAN間ルーティング |
| NAT to Internet | R x2 + SW + SV + PC x2 | ダイナミックNAT、ACL |
| Empty Canvas | なし | ゼロからの自由構築 |

---

## 7. データ永続化仕様

### 7.1 保存方式

| 方式 | 説明 |
|------|------|
| **自動保存** | 設定変更時にブラウザのlocalStorageへ自動保存 |
| **手動保存** | タイムスタンプ付きでlocalStorageに保存（File > Save） |
| **JSON エクスポート** | JSON形式でファイルとしてダウンロード（File > Export JSON） |
| **JSON インポート** | JSONファイルから設定を読み込み（File > Import JSON） |
| **スクリプトエクスポート** | 全デバイスの設定をCLIコマンド形式のテキストファイルで出力（File > Export Script） |
| **テンプレート** | 構成済みネットワークテンプレートからロード（Templates） |
| **リセット** | 確認ダイアログ付きで初期状態に復元（Reset） |

### 7.2 保存データ形式

**JSON形式**で以下のデータを保存:
- 全デバイスの設定（IPアドレス、ルーティング、NAT、ACL、VLAN、ファイアウォールポリシー等）
- 全リンクの接続情報
- デバイスのキャンバス上の位置

### 7.3 スクリプトエクスポート形式

テキストファイル（`.txt`）で全デバイスの設定を実行可能なCLIコマンド順に出力:
- デバイスごとに `enable` → `configure terminal` → 各設定 → `end`
- ACL/NATプールはインターフェースより前に定義（参照順序を考慮）
- VLAN、ファイアウォールポリシー、スタティックルート、デフォルトゲートウェイすべて含む

### 7.4 スプリッター位置

キャンバスとターミナルの境界位置をlocalStorageに保存し、リロード時に復元します。

---

## 8. 制約事項・実機との差異

| 項目 | 本シミュレータ | 実機Cisco IOS |
|------|--------------|---------------|
| IPバージョン | IPv4のみ | IPv4/IPv6 |
| ルーティングプロトコル | スタティックルートのみ | OSPF, BGP, EIGRP等 |
| ファイアウォール | ステートレス（状態非追跡） | ステートフル |
| L2プロトコル | VLAN、基本スイッチング | STP, LACP, LLDP等 |
| NAT | スタティック、ダイナミック（基本） | PAT, NAT-T等の高度な機能 |
| ACL | 標準ACL（1-99）、拡張ACL（100-199） | 標準/拡張/名前付きACL |
| QoS | なし | 各種QoS機能 |
| スパニングツリー | なし（ループ防止なし） | STP/RSTP/MSTP |
