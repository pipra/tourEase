import { router } from 'expo-router'
import { Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { auth } from './firebase'

const Home = () => {
  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.push('/');
    } catch(error) {
      console.log(error.message)
    }
  } 
  
  return (
    <SafeAreaView className="flex-1 justify-center items-center">
        <Text style={{ color: '#6200EE', fontSize: 40, fontWeight: 'bold' }}>
            TourEase
        </Text>
        <Text style={{ color: 'black', fontSize: 20, marginTop: 10 }}>
            Your Smart Travel solution
        </Text>

        <Text 
        onPress={handleLogout}
        style={{color: '#6200EE', marginTop: 200, fontSize: 20, fontWeight: 'bold'}}>
          Logout
        </Text>
    </SafeAreaView>
  )
}

export default Home