// @ts-check

/**
 * packet format
 * | state | display | checksum | \r\n |
 * |  1B   |    6B   |    1B    |  2B  |
 */
const PACKET_LENGTH=10;

export class StackMat{
    static STATE = {
        RUNNING:' ',
        IDLE:'I',
        LEFT:'L',
        RIGHT:'R',
        BOTH:'C',
        READY:'A',
        STOP:'S'
    };

    #reader;

    /**
     * @param {{
     *      reader:ReadableStreamDefaultReader<Uint8Array>;
     * }} params 
     */
    constructor(params) {
        this.#reader = params.reader;
        this.#readTask();
    }

    async #readTask(){
        /** @type {Uint8Array} */
        let dataRemain = new Uint8Array();
        for(;;){
            const {value,done} = await this.#reader.read();
            if(done){
                this.onReaderClosed?.();
                this.#reader.releaseLock();
                console.log('reader closed');
                break;
            }
            let allData = new Uint8Array(dataRemain.length+value.length);
            allData.set(dataRemain,0);
            allData.set(value,dataRemain.length);
            let cutoff = 0;
            for(let i=0;i<allData.length-1;i++){
                if(allData[i]==='\n'.charCodeAt(0)&&allData[i+1]==='\r'.charCodeAt(0)){
                    if(i>=8){
                        console.log(allData);
                        console.log(allData.length,String.fromCharCode(...allData));
                        try {
                            let packet = allData.slice(i-8,i+2);
                            this.#checkPacket(packet);
                            let state = String.fromCharCode(packet[0]);
                            let display = String.fromCharCode(...packet.slice(1,7));
                            this.onMessage?.({state,display});
                        } catch (error) {
                            console.log(error);
                        }
                    }
                    cutoff = i+2;
                }
            }
            dataRemain = allData.slice(cutoff);
        }
    }

    /**
     * 
     * @param {Uint8Array} raw 
     */
    #checkPacket(raw){
        if(raw.length!==PACKET_LENGTH){
            throw new Error('Wrong packet length');
        }
        let sum = 64;
        for(let i=1;i<7;i++){
            sum += raw[i]-'0'.charCodeAt(0);
        }
        sum &= 0xFF;
        if(sum !== raw[7]){
            throw new Error('Checksum error');
        }
    }

    /**
     * @param {{
     *      state:string;
     *      display:string;
     * }} params 
     */
    onMessage = (params)=>{};
    
    onReaderClosed = ()=>{};
}
