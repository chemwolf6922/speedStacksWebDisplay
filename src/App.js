// @ts-check
import './App.css';
import React from 'react';
import { SpeedStacks } from './speedStacks.js';

class App extends React.Component {
    #port;
    /** @type {SpeedStacks} */
    #speedStacks;

    state = {
        connected:false,
        state:SpeedStacks.STATE.IDLE,
        display:'000000'
    };

    async onConnectButtonClick(){
        if(this.#port){
            return;
        }
        // @ts-ignore
        this.#port = await navigator.serial.requestPort();
        await this.#port.open({baudRate:1200});
        console.log('Serial port opened');
        const reader = this.#port.readable.getReader();
        this.#speedStacks = new SpeedStacks({reader});
        this.#speedStacks.onMessage = this.onMessage.bind(this);
        this.#speedStacks.onReaderClosed = this.onReaderClosed.bind(this);
        this.setState({connected:true});
    }

    /**
     * @param {{
     *      state:string,
     *      display:string
     * }} params 
     */
    async onMessage(params){
        this.setState(params);
    }

    async onReaderClosed(){
        console.log('Disconnected');
    }

    render(){
        return (
            <div className='App'>
                <button onClick={this.onConnectButtonClick.bind(this)} hidden={this.state.connected}>Connect timer</button>
                <div className='display'>{
                    `${this.state.display[0]}:${this.state.display.substring(1,3)}.${this.state.display.substring(3)}`
                }</div>
            </div>
        );
    }
}

export default App;
