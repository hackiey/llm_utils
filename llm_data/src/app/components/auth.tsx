
import { signIn } from 'next-auth/react'

function SignIn() {
    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      try {
            const payload = Object.fromEntries(data);
            const res = await signIn('credentials', {
            ...payload,
            redirect: false
            })
        } catch (error) {
            console.error('An unexpected error happened occurred:', error)
        }
    //...
  }
}
  
export default SignIn;