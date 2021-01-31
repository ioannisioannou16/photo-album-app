import { CameraFilled } from "@ant-design/icons";
import { Button } from "antd";
import { useSelector } from "react-redux";
import _ from "lodash";
import config from "../config";

export default () => {
  const auth = useSelector(state => state.auth);
  return (
    <div style={{ marginLeft: 40, marginRight: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ fontSize: 22, fontWeight: 600 }}>
        <CameraFilled />
        <span style={{ marginLeft: 8 }}>PhotoAlbum</span>
      </div>
      {_.isNil(auth.token)
        ? <Button type="link" size="large"><a href={config.loginUrl}>Login</a></Button>
        : <Button type="link" size="large"><a href={config.logoutUrl}>Logout</a></Button>
      }
    </div>
  );
}
