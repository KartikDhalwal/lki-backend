import bcrypt from "bcryptjs";

const password = "Admin@123";

const run = async () => {
  const hash = await bcrypt.hash(password, 10);
  console.log(hash);
};

run();
