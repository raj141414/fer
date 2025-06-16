/*
  # Create orders table for shared data storage

  1. New Tables
    - `orders`
      - `id` (uuid, primary key)
      - `order_id` (text, unique) - The ORD-xxx format ID
      - `full_name` (text)
      - `phone_number` (text)
      - `print_type` (text)
      - `binding_color_type` (text, optional)
      - `copies` (integer)
      - `paper_size` (text)
      - `print_side` (text)
      - `selected_pages` (text)
      - `color_pages` (text)
      - `bw_pages` (text)
      - `special_instructions` (text)
      - `files` (jsonb) - Store file information as JSON
      - `total_cost` (decimal)
      - `status` (text) - pending, processing, completed, cancelled
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `orders` table
    - Add policies for public read/write (since this is a public service)
*/

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text UNIQUE NOT NULL,
  full_name text NOT NULL,
  phone_number text NOT NULL,
  print_type text NOT NULL,
  binding_color_type text,
  copies integer DEFAULT 1,
  paper_size text,
  print_side text,
  selected_pages text,
  color_pages text,
  bw_pages text,
  special_instructions text,
  files jsonb DEFAULT '[]'::jsonb,
  total_cost decimal(10,2) DEFAULT 0,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Allow public access for this demo (in production, you'd want proper auth)
CREATE POLICY "Allow public read access to orders"
  ON orders
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert access to orders"
  ON orders
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update access to orders"
  ON orders
  FOR UPDATE
  TO public
  USING (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_order_id ON orders(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);