const assert = require('assert');
const ganache = require('ganache-cli');
const Web3 = require('web3');
const web3 = new Web3(ganache.provider());
const { abi, evm } = require('../compile');

let lottery;
let accounts;

beforeEach(async () => {
    accounts = await web3.eth.getAccounts();
    lottery = await new web3.eth.Contract(abi)
        .deploy({ data: evm.bytecode.object })
        .send({ from: accounts[0], gas: '1000000' });
});

describe('Lottery Contract', () => {
    it('deploys a contract', () =>{
        assert.ok(lottery.options.address);
    });

    it('allows one account to enter', async () => {
        await lottery.methods.enter().send({ 
            from: accounts[0],
            value: web3.utils.toWei('0.02', 'ether') //web3函式庫提供的單位轉換方法
        });

        const players = await lottery.methods.getPlayers().call({
            from: accounts[0]
        });
    
        assert.equal(accounts[0], players[0]);
        assert.equal(1, players.length);
    });

    it('allows multiple accounts to enter', async () => {
        await lottery.methods.enter().send({ 
            from: accounts[0],
            value: web3.utils.toWei('0.02', 'ether') //web3函式庫提供的單位轉換方法
        });

        await lottery.methods.enter().send({ 
            from: accounts[1],
            value: web3.utils.toWei('0.02', 'ether') //web3函式庫提供的單位轉換方法
        });

        await lottery.methods.enter().send({ 
            from: accounts[2],
            value: web3.utils.toWei('0.02', 'ether') //web3函式庫提供的單位轉換方法
        });

        const players = await lottery.methods.getPlayers().call({
            from: accounts[0]
        });
    
        assert.equal(accounts[0], players[0]);
        assert.equal(accounts[1], players[1]);
        assert.equal(accounts[2], players[2]);
        assert.equal(3, players.length);
    });

    it('require a minimum amount of ether to enter', async () => {
        try {
            await lottery.methods.enter().send({
                from: accounts[0],
                value: '200'
            });

            assert(false); //我們預計這段測試一定會進入catch，所以該敘述不該被觸發，如果觸發代表測試失敗。
        } catch (error) {
            assert(error);
        }
    });

    it('only manager can call pickWinner', async () => {
        try {
            await lottery.methods.pickWinner().send({
                from: accounts[1]
            });

            assert(false);
        } catch (error) {
            assert(error);
        }
    });

    it('sends money to the winner and resets the players array', async () => {
        await lottery.methods.enter().send({
            from: accounts[0],
            value: web3.utils.toWei('2', 'ether')
        });

        const initialBalance = await web3.eth.getBalance(accounts[0]);

        await lottery.methods.pickWinner().send({
            from: accounts[0]
        });

        const finalBalance = await web3.eth.getBalance(accounts[0]);
        const difference = finalBalance - initialBalance;
        const winner = await lottery.methods.latestWinner().call();

        //為什麼不是2以太，因為有些拿去付GAS錢了
        assert(difference > web3.utils.toWei('1.8', 'ether'));

        const players = await lottery.methods.getPlayers().call({
            from: accounts[0]
        });

        assert.equal(accounts[0], winner);
        assert.equal(0, players.length);

    });

});