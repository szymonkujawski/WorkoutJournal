import WorkoutHistory from '../components/WorkoutHistory';
import { motion } from 'framer-motion';

export default function History() {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }} 
      animate={{ opacity: 1, x: 0 }}   
      exit={{ opacity: 0, x: 20 }}     
      transition={{ duration: 0.2 }}
      style={{ paddingBottom: '20px' }}
    >
      <WorkoutHistory />
    </motion.div>
  );
}