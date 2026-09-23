import { createContext, useContext } from 'react';

export const SocketContext = createContext(undefined);

export function useSocket(){
	const context = useContext(SocketContext);
	if(context == undefined){
		throw new Error("useSocket doit être utilisé dans un SocketProvider")
	}
	return context
}
