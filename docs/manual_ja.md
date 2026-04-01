# ネットワークシミュレータ 操作マニュアル

**バージョン:** 1.1
**最終更新日:** 2026-04-01

---

## 1. はじめに

本マニュアルでは、ネットワークシミュレータの起動方法から各機能の操作手順までを解説します。

---

## 2. 起動方法

1. `index.html` をWebブラウザで開きます
2. シミュレータが起動し、デフォルトのネットワークトポロジが表示されます
3. 前回の設定がlocalStorageに保存されている場合は自動的に復元されます

---

## 3. 画面の見かた

### 3.1 全体構成

| エリア | 説明 |
|--------|------|
| **ヘッダー** | アプリケーションタイトル、デバイスタブ、ツールバーボタン |
| **キャンバス（左）** | ネットワークトポロジの図示。デバイスとリンクが描画される |
| **ターミナル（右）** | CLIコマンドの入力と出力 |

### 3.2 デバイスタブ

ヘッダー部分にデバイスごとのタブが表示されます。タブをクリックすると、そのデバイスのCLIに切り替わります。

### 3.3 デバイスタイプ色

各デバイスはタイプ固有の色で表示されます。ステータスは明暗で表現されます。

| デバイス | 色 |
|---------|-----|
| ルーター | 緑 |
| スイッチ | オレンジ |
| ファイアウォール | 赤 |
| サーバー | 紫 |
| PC | 青 |

| 明暗 | 意味 |
|------|------|
| 明るい | 全インターフェースUP |
| 暗い | 一部UP |
| 最も暗い | 全DOWN |

### 3.4 ツールバー

| ボタン | 機能 |
|--------|------|
| **File ▾** | ドロップダウンメニュー（Save/Load/Export JSON/Import JSON/Export Script） |
| **Templates** | テンプレート選択画面を表示 |
| **Design Mode** | デザインモードの切替 |
| **Reset** | 初期状態にリセット |
| **? Help** | コマンドリファレンスを表示（キャンバス左下） |

### 3.5 スプリッター

キャンバスとターミナルの境界をドラッグして、左右のパネル比率を調整できます。位置はブラウザに保存され、リロード時に復元されます。

---

## 4. デザインモード（トポロジ編集）

### 4.1 デザインモードの開始

ツールバーの「Design Mode」ボタンをクリックしてデザインモードに切り替えます。画面左側にデバイスパレットが表示されます。

### 4.2 デバイスの追加

1. 左側のパレットからデバイス（Router、Switch、Firewall、Server、PC）をドラッグ
2. キャンバス上の任意の場所にドロップ
3. 自動的に名前が付与されます（R1, SW1, FW1, SV1, PC1等）

### 4.3 デバイスの移動

デザインモード中にキャンバス上のデバイスをドラッグして位置を変更できます。

### 4.4 リンクの作成

1. デバイスパレットの「Link」ツールを選択
2. 接続元デバイスをクリック
3. 接続先デバイスをクリック
4. インターフェース選択ダイアログが表示されるので、両端のインターフェースを選択
5. 「Connect」をクリックしてリンクを作成

### 4.5 右クリックメニュー

- **デバイス上で右クリック**: デバイスの削除、名前変更等
- **リンク上で右クリック**: リンクの削除

### 4.6 デザインモードの終了

「Design Mode」ボタンを再度クリックして通常モードに戻ります。

---

## 5. CLIの基本操作

### 5.1 コマンド入力

ターミナル下部のプロンプトにコマンドを入力し、Enterキーで実行します。

### 5.2 タブ補完

コマンドの一部を入力してTabキーを押すと、自動的にコマンドが補完されます。

**例:**
```
Router> en[Tab]  →  Router> enable
Router# conf[Tab]  →  Router# configure terminal
```

### 5.3 コマンド略語

Cisco IOSと同様に、一意に特定できる範囲でコマンドを省略できます。

**例:**
```
conf t     → configure terminal
int gi0/0  → interface GigabitEthernet0/0
sh ip int br → show ip interface brief
```

### 5.4 コマンド履歴

- **上矢印キー**: 前のコマンドを表示
- **下矢印キー**: 次のコマンドを表示

### 5.5 コマンドヒント

入力中にターミナル下部にコンテキストに応じたコマンド候補がリアルタイムで表示されます。

### 5.6 デバイスの切替

- ヘッダーのデバイスタブをクリック
- または別のデバイスのプロンプトが自動的に表示される場合があります

---

## 6. 基本設定チュートリアル

### 6.1 ルーターのIPアドレス設定

```
Router> enable
Router# configure terminal
Router(config)# interface GigabitEthernet0/0
Router(config-if)# ip address 192.168.1.1 255.255.255.0
Router(config-if)# no shutdown
Router(config-if)# end
```

### 6.2 PCのIPアドレスとデフォルトゲートウェイ設定

```
PC> enable
PC# configure terminal
PC(config)# interface FastEthernet0
PC(config-if)# ip address 192.168.1.10 255.255.255.0
PC(config-if)# no shutdown
PC(config-if)# exit
PC(config)# ip default-gateway 192.168.1.1
PC(config)# end
```

### 6.3 スタティックルートの設定

```
Router# configure terminal
Router(config)# ip route 10.0.0.0 255.255.255.0 192.168.1.2
Router(config)# end
```

### 6.4 疎通確認

```
PC# ping 192.168.1.1
```

成功するとキャンバス上でパケットのアニメーションが表示され、ターミナルに結果が出力されます。

### 6.5 サーバーの設定

サーバーはPCと異なり、複数インターフェースとスタティックルートを持てます。

```
Server> enable
Server# configure terminal
Server(config)# interface Ethernet0
Server(config-if)# ip address 192.168.1.100 255.255.255.0
Server(config-if)# no shutdown
Server(config-if)# exit
Server(config)# interface Ethernet1
Server(config-if)# ip address 10.0.0.100 255.255.255.0
Server(config-if)# no shutdown
Server(config-if)# exit
Server(config)# ip default-gateway 192.168.1.1
Server(config)# ip route 172.16.0.0 255.255.0.0 10.0.0.1
Server(config)# end
```

### 6.6 経路追跡

```
PC# traceroute 10.0.0.1
```

各ホップの情報がターミナルに表示されます。

---

## 7. VLAN設定ガイド

### 7.1 VLANの作成

```
Switch> enable
Switch# configure terminal
Switch(config)# vlan 10
Switch(config-vlan)# name Sales
Switch(config-vlan)# exit
Switch(config)# vlan 20
Switch(config-vlan)# name Engineering
Switch(config-vlan)# end
```

### 7.2 アクセスポートの設定

```
Switch(config)# interface FastEthernet0/1
Switch(config-if)# switchport mode access
Switch(config-if)# switchport access vlan 10
Switch(config-if)# no shutdown
```

### 7.3 トランクポートの設定

```
Switch(config)# interface FastEthernet0/24
Switch(config-if)# switchport mode trunk
Switch(config-if)# switchport trunk allowed vlan 10,20
Switch(config-if)# no shutdown
```

### 7.4 VLAN情報の確認

```
Switch# show vlan brief
Switch# show interfaces trunk
Switch# show interfaces switchport
```

---

## 8. NAT設定ガイド

### 8.1 スタティックNAT

内部IP `192.168.1.10` を外部IP `203.0.113.10` に1対1で変換する場合:

```
Router(config)# interface GigabitEthernet0/0
Router(config-if)# ip nat inside
Router(config-if)# exit
Router(config)# interface GigabitEthernet0/1
Router(config-if)# ip nat outside
Router(config-if)# exit
Router(config)# ip nat inside source static 192.168.1.10 203.0.113.10
```

### 8.2 ダイナミックNAT

ACLで内部ネットワークを定義し、NATプールから動的にIPを割り当てる場合:

```
Router(config)# access-list 1 permit 192.168.1.0 0.0.0.255
Router(config)# ip nat pool MYPOOL 203.0.113.1 203.0.113.10 netmask 255.255.255.0
Router(config)# ip nat inside source list 1 pool MYPOOL
```

### 8.3 NAT状態の確認

```
Router# show ip nat translations
Router# show ip nat statistics
```

---

## 9. ファイアウォール設定ガイド

### 9.1 ポリシーの追加

内部ネットワーク `192.168.1.0/24` から外部へのICMPを許可:

```
FW(config)# firewall policy 10 permit 192.168.1.0 0.0.0.255 any any icmp
```

特定のホスト間のTCPポート80を許可:

```
FW(config)# firewall policy 20 permit 192.168.1.10 0.0.0.0 10.0.0.1 0.0.0.0 tcp 80
```

全トラフィックを拒否（明示的なdeny all、通常は暗黙で存在）:

```
FW(config)# firewall policy 999 deny any any any any ip
```

### 9.2 ポリシーの確認と削除

```
FW# show firewall policy

FW(config)# no firewall policy 20        # 特定のポリシーを削除
FW(config)# no firewall policy all       # 全ポリシーを削除
```

### 9.3 重要な注意事項

- ポリシーはシーケンス番号の昇順で評価されます
- 最初にマッチしたルールが適用されます
- どのルールにもマッチしない場合、暗黙の **deny all** が適用されます
- ファイアウォールはステートレスです（戻りの通信も明示的に許可が必要）

---

## 10. ACL（アクセス制御リスト）設定ガイド

### 10.1 標準ACLの作成

送信元IPアドレスでフィルタリングする標準ACL（番号1〜99）:

```
Router(config)# access-list 10 permit 192.168.1.0 0.0.0.255
Router(config)# access-list 10 deny 10.0.0.0 0.0.0.255
```

### 10.2 拡張ACLの作成

送信元/宛先IP、プロトコル、ポート番号でフィルタリングする拡張ACL（番号100〜199）:

**例1: 特定ネットワーク間のHTTP通信を許可**
```
Router(config)# access-list 100 permit tcp 192.168.1.0 0.0.0.255 10.0.0.0 0.0.0.255 eq 80
```

**例2: 特定ホストからのICMPを拒否**
```
Router(config)# access-list 100 deny icmp host 192.168.1.100 any
```

**例3: 残りのトラフィックを全て許可**
```
Router(config)# access-list 100 permit ip any any
```

#### キーワード

| キーワード | 意味 | 例 |
|-----------|------|-----|
| `any` | 全IPアドレス | `access-list 100 permit ip any any` |
| `host <ip>` | 単一ホスト（ワイルドカード0.0.0.0） | `access-list 100 deny icmp host 10.0.0.1 any` |
| `eq <port>` | TCP/UDPポート番号を指定 | `... tcp ... eq 443` |

### 10.3 ACLをインターフェースに適用

ACLを定義した後、インターフェースに適用して初めてフィルタリングが有効になります。

```
Router(config)# interface GigabitEthernet0/0
Router(config-if)# ip access-group 100 in       # 受信方向に適用
Router(config-if)# exit
Router(config)# interface GigabitEthernet0/1
Router(config-if)# ip access-group 100 out      # 送信方向に適用
```

### 10.4 ACLの確認

```
Router# show access-lists                       # ACL一覧と適用先
Router# show running-config                     # ip access-groupの設定を含む全設定
```

### 10.5 ACLの削除

```
Router(config)# no access-list 100              # ACL全体を削除
```

または、インターフェースからの解除のみ:

```
Router(config-if)# no ip access-group 100 in    # inbound ACLを解除
```

### 10.6 重要な注意事項

- ACLは定義順（上から下）に評価されます
- 最初にマッチしたエントリで判定されます（以降は評価されない）
- **暗黙のdeny all**: どのエントリにもマッチしない場合、パケットは破棄されます
- ACLを定義しても、`ip access-group` でインターフェースに適用しないとフィルタリングは行われません
- 標準ACLはNATの条件定義（`ip nat inside source list`）にも使用できます

---

## 11. パケットフロー診断

### 11.1 show packet-flow コマンド

パケットが宛先に到達するまでの各ホップでの判断を詳細に表示します。

```
Router# show packet-flow 10.0.0.1
```

### 11.2 出力の読み方

```
=== Packet-Flow to 10.0.0.1 ===
[R1] 192.168.1.1
  ├ Check: Is destination local? → No
  ├ NAT: No translation
  ├ Route: 10.0.0.0/24 via 192.168.2.2
  └ Forward: GigabitEthernet0/1 → R2

[R2] 192.168.2.2
  ├ Check: Is destination local? → No
  ├ Route: 10.0.0.0/24 via directly connected
  └ Forward: GigabitEthernet0/0 → destination
```

| 記号 | 意味 |
|------|------|
| `├` | 中間チェック |
| `└` | 転送判断 |
| `✗` | エラー（到達不能等） |
| `~` | L2スイッチング |

---

## 12. ARP解決の可視化

### 12.1 概要

pingコマンド実行時、宛先デバイスのMACアドレスがARPテーブルにない場合、ICMPパケットアニメーションの前にARP解決プロセスが視覚的に表示されます。

### 12.2 ARP解決の流れ

1. **ARP Request（ブロードキャスト）**: 金色のダイヤモンド型パーティクルが送信元からスイッチに向かい、L2ブロードキャストドメイン内の全デバイスに同時にフラッドされます
2. **ヒット/ミス判定**: ターゲットデバイスに緑のチェックマーク、非ターゲットデバイスに赤の×マークが表示されます
3. **ARP Reply（ユニキャスト）**: オレンジのダイヤモンド型パーティクルがターゲットから送信元に戻り、MACアドレスが表示されます
4. **ICMP開始**: ARP解決完了後、通常のping（緑/青のパーティクル）が開始されます

### 12.3 ARPテーブルの確認

```
Router# show arp
Protocol  Address      Age (min)  Hardware Addr   Type  Interface
Internet  10.0.1.1     -          00:50:56:36:d7:dd  ARPA  Gi0/0
Internet  172.16.0.11  0          00:50:56:b3:00:72  ARPA  Gi0/1
```

### 12.4 ARPキャッシュのクリア

```
Router# clear arp
```

ARPキャッシュをクリアすると、次回のpingで再びARP解決アニメーションが表示されます。これにより、ブロードキャストの挙動を繰り返し確認できます。

### 12.5 VLAN分離とARP

ARPブロードキャストは**同一VLAN内**のデバイスにのみ到達します。異なるVLANに属するデバイスにはARPが届かないため、同一サブネットであってもVLANが異なればpingは失敗します。

```
例: Firewall Gi0/1 (VLAN 1) → DBServer Eth1 (VLAN 20)
    → IPサブネットが同じでもVLANが異なるため通信不可
```

### 12.6 ターミナル出力

ARP解決時、ターミナルに金色のメッセージが表示されます:

```
ARP: Firewall1 — Who has 172.16.0.11? Tell 172.16.0.1
ARP: 172.16.0.11 is at 00:50:56:b3:00:72
```

---

## 13. 設定の保存と読み込み

すべてのファイル操作はツールバーの「**File ▾**」ドロップダウンメニューから行います。

### 12.1 手動保存

「File ▾」>「Save」をクリックすると、現在の全設定がブラウザのlocalStorageに保存されます。

### 12.2 手動読み込み

「File ▾」>「Load」をクリックすると、最後に保存した設定を読み込みます。

### 12.3 JSONエクスポート

1. 「File ▾」>「Export JSON」をクリック
2. JSON形式の設定ファイルが自動的にダウンロードされます
3. このファイルを他の環境やバックアップとして保管できます

### 12.4 JSONインポート

1. 「File ▾」>「Import JSON」をクリック
2. ファイル選択ダイアログでJSONファイルを選択
3. 設定が読み込まれ、トポロジが復元されます

### 12.5 コマンドスクリプトエクスポート

1. 「File ▾」>「Export Script」をクリック
2. 全デバイスの設定がCLIコマンド形式のテキストファイルとしてダウンロードされます
3. 実機やテスト環境でそのままコマンドとして投入できる形式です

出力例:
```
! Device: Router1 (ROUTER) [R1]
enable
configure terminal
hostname Router1
interface GigabitEthernet0/0
 ip address 192.168.1.1 255.255.255.0
 no shutdown
 exit
ip route 10.0.0.0 255.255.255.0 192.168.2.2
end
```

### 12.6 テンプレートからのロード

1. ツールバーの「Templates」ボタンをクリック
2. テンプレート選択画面が表示されます
3. 構成をクリックすると即座にロードされます（IP設定済み、すぐに動作確認可能）

利用可能なテンプレート:
- **Simple LAN** — R1 + SW1 + PC x3
- **Multi-Subnet Routing** — R x2 + SW x2 + PC x4
- **DMZ with Firewall** — FW + R + SW x2 + SV x2 + PC x2
- **VLAN with Inter-VLAN Routing** — R1 + SW1(VLAN10/20) + PC x4
- **NAT to Internet** — R x2 + SW + SV + PC x2
- **Empty Canvas** — 空のキャンバス

### 12.7 初期化（リセット）

1. ツールバーの「Reset」ボタンをクリック
2. 確認ダイアログが表示されます
3. 確認すると、デフォルトのトポロジと設定に戻ります

---

## 14. トラブルシューティング

### 14.1 Pingが失敗する

| 確認事項 | コマンド |
|----------|---------|
| 送信元のIPアドレスが設定されているか | `show ip interface brief` |
| インターフェースがUPか | `show ip interface brief` |
| ルーティングテーブルに宛先への経路があるか | `show ip route` |
| PCのデフォルトゲートウェイが正しいか | `show running-config` |
| ACLでブロックされていないか | `show access-lists` |
| ファイアウォールポリシーでブロックされていないか | `show firewall policy` |
| NATの設定が正しいか | `show ip nat translations` |
| パケットフロー診断で原因を特定 | `show packet-flow <宛先IP>` |

### 14.2 VLANが通じない

| 確認事項 | コマンド |
|----------|---------|
| VLANが作成されているか | `show vlan brief` |
| ポートに正しいVLANが割り当てられているか | `show interfaces switchport` |
| トランクポートで該当VLANが許可されているか | `show interfaces trunk` |
| 両端のポートが同じVLANか | 両スイッチで `show vlan brief` |
| ARPがVLAN境界を越えていないか | `clear arp` して `ping` でARP可視化を確認 |

### 14.3 NATが動作しない

| 確認事項 | コマンド |
|----------|---------|
| inside/outsideインターフェースが設定されているか | `show running-config` |
| ACLが正しく定義されているか | `show access-lists` |
| NATプールに利用可能なIPがあるか | `show ip nat statistics` |
| スタティックNATエントリが正しいか | `show ip nat translations` |

### 14.4 ACLでブロックされる

| 確認事項 | コマンド |
|----------|---------|
| どのACLがどのインターフェースに適用されているか | `show access-lists` |
| ACLエントリの順序は正しいか（上から評価される） | `show access-lists` |
| 暗黙のdeny allを考慮して最後にpermit ip any anyがあるか | `show access-lists` |
| パケットフローでどこでブロックされるか | `show packet-flow <宛先IP>` |

---

## 15. キーボードショートカット

| キー | 動作 |
|------|------|
| **Enter** | コマンド実行 |
| **Tab** | コマンド補完 |
| **上矢印** | コマンド履歴（前） |
| **下矢印** | コマンド履歴（次） |

---

## 16. よくある質問（FAQ）

**Q: ブラウザを閉じると設定は消えますか？**
A: 自動保存機能により、localStorageに設定が保持されます。ただし、ブラウザの閲覧データを消去すると失われるため、重要な設定はJSONエクスポートでバックアップしてください。

**Q: 動的ルーティング（OSPF等）は使えますか？**
A: 本シミュレータはスタティックルートのみ対応しています。動的ルーティングプロトコルはサポートしていません。

**Q: IPv6は使えますか？**
A: 現在IPv4のみ対応しています。

**Q: 最大何台までデバイスを追加できますか？**
A: 明確な上限はありませんが、多数のデバイスを追加するとブラウザのパフォーマンスに影響する場合があります。

**Q: 設定を他の人と共有できますか？**
A: JSONエクスポート機能で設定ファイルを書き出し、相手にインポートしてもらうことで共有できます。
