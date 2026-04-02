import { useCallback, useEffect, useRef, useState } from 'react';
import DeviceInfo from 'react-native-device-info';
import { checkForUpdate, UpdateInfo } from '../services/updateService';

const CHECK_DELAY_MS = 1_500;

export interface AppUpdateState {
  modalVisible: boolean;
  updateData: UpdateInfo | null;
  dismiss: () => void;
  checkNow: () => void;
}

export function useAppUpdate(): AppUpdateState {
  const [modalVisible, setModalVisible] = useState(false);
  const [updateData, setUpdateData] = useState<UpdateInfo | null>(null);
  const hasChecked = useRef(false);

  const runCheck = useCallback(async () => {
    const buildNumber = parseInt(await DeviceInfo.getBuildNumber(), 10);
    const result = await checkForUpdate(buildNumber);
    if (result.available) {
      setUpdateData(result.info);
      setModalVisible(true);
    }
  }, []);

  useEffect(() => {
    if (hasChecked.current) return;
    hasChecked.current = true;
    const tid = setTimeout(runCheck, CHECK_DELAY_MS);
    return () => clearTimeout(tid);
  }, [runCheck]);

  const dismiss = useCallback(() => {
    if (updateData?.is_force_update) return;
    setModalVisible(false);
  }, [updateData]);

  const checkNow = useCallback(() => {
    runCheck();
  }, [runCheck]);

  return { modalVisible, updateData, dismiss, checkNow };
}
