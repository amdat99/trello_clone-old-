// @typescript-eslint/no-unused-expressions
import React, { useEffect } from "react";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import { Tooltip, Avatar, Box, Card } from "@mui/material";
import Divider from "@mui/material/Divider";
import useFetchData from "../../hooks/useFetchData";
import getTheme from "../../theme";

function AddAssignedUsers({ onAssignUser }) {
  const { data: users, fetchData: fetchUsers } = useFetchData(
    {
      type: "post",
      route: "profile/orguser",
    },
    "profile/orguser"
  );

  const theme = getTheme("light").palette;

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <Card className="hide-scroll" sx={{ p: 1, maxHeight: 300, overflow: "scroll" }}>
      <Typography sx={{ color: theme.primary.main }} variant="body1">
        Members
      </Typography>
      <Divider sx={{ mb: 1 }} />

      {users &&
        users.map((option) => (
          <Box key={option.public_id}>
            <MenuItem dense divider value={option} onClick={() => onAssignUser(option)}>
              <Tooltip title={option.user_name} placement="bottom" key={option.user_name}>
                <Avatar sx={avatarStyles(option.color)}>{option.user_name[0].toUpperCase()}</Avatar>
              </Tooltip>
              {option.user_name}
            </MenuItem>
          </Box>
        ))}
    </Card>
  );
}

const avatarStyles = (color: string) => ({
  width: 20,
  height: 20,
  bgcolor: color,
  fontSize: 15,
  mb: 0.5,
  position: "relative",
  right: 14,
});

export default AddAssignedUsers;