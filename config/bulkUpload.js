import { collection, doc, setDoc } from 'firebase/firestore';
import guides from '../store/tour';
import {db} from "../app/(auth)/firebase";

const guideData = guides

const uploadData = async () => {
    try {
        for(let i = 0 ; i < guideData.length ; i++) {
            const guide = guideData[i];
            // console.log(guide);
            const docRef = doc(collection(db, "guides"), `guide_${i + 1}`);
            await setDoc(docRef, guide);
        }
        console.log("Data Uploaded");
    } catch(error) {
        console.log("Error uploading data", error);
    }
};

export default uploadData;