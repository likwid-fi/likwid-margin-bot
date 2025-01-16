# Margin Trading Bot

这是一个基于 Node.js、TypeScript 和 Ethers.js v6 开发的杠杆交易机器人，用于与 MarginPositionManager 和 MarginHookManager 合约交互。

## 功能特性

- TypeScript 支持，使用 TypeChain 生成类型安全的合约交互代码
- 使用 Ethers.js v6 与以太坊区块链交互
- 完整的杠杆交易功能支持：
  - 创建杠杆仓位
  - 查询仓位信息
  - 检查清算状态
  - 估算收益/损失
  - 关闭仓位
- 环境变量配置支持
- 日志记录系统
- 错误处理机制

## 项目结构

```plaintext
.
├── src/                    # 源代码目录
│   ├── abis/               # 合约 ABI 文件
│   ├── config/            # 配置文件
│   ├── services/          # 业务逻辑服务
│   ├── types/             # TypeScript 类型定义
│   │   └── contracts/     # TypeChain 生成的合约类型
│   └── utils/             # 工具函数
├── .env                   # 环境变量配置
├── .gitignore            # Git 忽略文件
├── package.json          # 项目依赖配置
├── tsconfig.json         # TypeScript 配置
└── README.md             # 项目文档
```

## 安装

1. 克隆项目

   ```bash
   git clone <repository-url>
   ```

2. 安装依赖

   ```bash
   npm install
   ```

3. 配置环境变量
   复制 `.env.example` 文件为 `.env` 并填写必要的配置：

   ```plaintext
   ETHEREUM_RPC_URL=your_rpc_url
   PRIVATE_KEY=your_private_key
   CHAIN_ID=1
   GAS_LIMIT=300000
   MAX_PRIORITY_FEE=2
   MAX_FEE_PER_GAS=50
   ```

4. 生成合约类型

   ```bash
   npm run typechain
   ```

5. 编译 TypeScript

   ```bash
   npm run build
   ```

6. 运行机器人

   ```bash
   npm start
   ```

## 使用示例

```typescript
// 创建杠杆仓位
const marginParams: MarginParamsStruct = {
  poolId: "0x...", // 池子 ID
  marginForOne: true, // 是否用 token1 做保证金
  leverage: 2n * 1000000n, // 2倍杠杆
  marginAmount: ethers.parseEther("1"), // 保证金金额
  marginTotal: ethers.parseEther("1"), // 总保证金
  borrowAmount: ethers.parseEther("1"), // 借款金额
  borrowMinAmount: ethers.parseEther("0.98"), // 最小借款金额
  recipient: wallet.address, // 接收地址
  deadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
};

// 创建仓位
const [marginWithoutFee, borrowAmount] = await contractService.createPosition(marginParams);

// 查询仓位
const position = await contractService.getPosition(positionId);

// 检查清算状态
const liquidationStatus = await contractService.checkLiquidate(positionId);

// 估算收益
const pnl = await contractService.estimatePNL(positionId, 1000000n);
```

## 开发

### 命令

- `npm run build`: 编译 TypeScript 代码
- `npm start`: 运行机器人
- `npm run dev`: 开发模式运行（支持热重载）
- `npm run typechain`: 生成合约类型定义
- `npm test`: 运行测试
- `npm run lint`: 运行代码检查

## 合约接口

### MarginPositionManager

- `getPosition`: 获取仓位信息
- `createPosition`: 创建杠杆仓位
- `closePosition`: 关闭仓位
- `getPositions`: 批量获取仓位信息
- `estimatePNL`: 估算收益/损失
- `checkLiquidate`: 检查清算状态

### MarginHookManager

- `getHookStatus`: 获取 Hook 状态
- `getReserves`: 获取池子储备金
- `getAmountIn`: 计算输入金额
- `getAmountOut`: 计算输出金额

## 安全提示

- 永远不要在代码中硬编码私钥
- 使用环境变量存储敏感信息
- 定期检查和更新依赖包
- 在主网部署前，建议在测试网进行充分测试
- 设置合理的 gas 限制和滑点保护

## 许可证

MIT
