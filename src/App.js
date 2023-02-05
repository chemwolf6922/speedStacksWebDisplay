// @ts-check
import './App.css';
import React from 'react';
import { StackMat } from './stackMat';
import { AudioSerial } from './audioSerial';

class App extends React.Component {
    /** @type {StackMat} */
    #stackMat;

    state = {
        connected:false,
        state:StackMat.STATE.IDLE,
        display:'000000'
    };

    async onConnectSerialButtonClick(){
        if(this.state.connected){
            return;
        }
        // @ts-ignore
        const port = await navigator.serial.requestPort();
        await port.open({baudRate:1200});
        console.log('Serial port opened');
        const reader = port.readable.getReader();
        this.#stackMat = new StackMat({reader});
        this.#stackMat.onMessage = this.onMessage.bind(this);
        this.#stackMat.onReaderClosed = this.onReaderClosed.bind(this);
        this.setState({connected:true});
    }

    async onConnectAudioButtonClick(){
        if(this.state.connected){
            return;
        }
        const port = new AudioSerial({cacheSize:20});
        await port.open();
        /** @todo */
        console.log('Audio opened');
        const reader = port.readable.getReader();
        this.#stackMat = new StackMat({reader});
        this.#stackMat.onMessage = this.onMessage.bind(this);
        this.#stackMat.onReaderClosed = this.onReaderClosed.bind(this);
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
                <button onClick={this.onConnectSerialButtonClick.bind(this)} hidden={this.state.connected}>Connect serial</button>
                <button onClick={this.onConnectAudioButtonClick.bind(this)} hidden={this.state.connected}>Connect audio</button>
                <div className='warning' hidden={this.state.connected}>Connection using audio is not recommended. The stackMat timer may mess with the system recording volume.</div>
                <div className='display'>{
                    `${this.state.display[0]}:${this.state.display.substring(1,3)}.${this.state.display.substring(3)}`
                }</div>
            </div>
        );
    }
}

export default App;
