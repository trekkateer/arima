// Imports Dependencies
import { createClient } from '@supabase/supabase-js'

// Creates new client
const supabase = createClient(
  process.env.REACT_APP_SB_PROJ_URL,
  process.env.REACT_APP_SB_PROJ_PUB_KEY
);

// Export
export default supabase